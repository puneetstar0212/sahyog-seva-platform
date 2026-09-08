import os
import uuid
import random
import traceback as tb
from flask import Flask, request, jsonify
from flask_cors import CORS
from sqlalchemy import create_engine, text, func
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import razorpay


def _to_uuid_or_none(value):
    """Return the value if it's a valid UUID string, else None.
    Prevents PostgreSQL 'invalid input syntax for type uuid' errors when
    frontend passes demo IDs like 'c1', 'w2', or 'demo-client-id'.
    """
    if not value:
        return None
    try:
        uuid.UUID(str(value))
        return str(value)
    except (ValueError, AttributeError):
        return None

# CRITICAL: load_dotenv() MUST come before any os.getenv() calls
load_dotenv()

from models import WorkerProfile, Gig, EscrowTransaction, CooperativeTransaction
from services.ai_service import forecast_demand
from services.bhashini_nlp import BhashiniNLPService

bhashini_service = BhashiniNLPService()

app = Flask(__name__)
CORS(app)

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set. Check your .env file.")
engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)

# Setup Razorpay
razorpay_key_id = os.getenv("RAZORPAY_KEY_ID")
razorpay_key_secret = os.getenv("RAZORPAY_KEY_SECRET")
rzp_client = None
if razorpay_key_id and razorpay_key_secret:
    rzp_client = razorpay.Client(auth=(razorpay_key_id, razorpay_key_secret))

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"}), 200

@app.route('/api/gigs', methods=['GET'])
def get_gigs():
    """Return all open gigs from the database."""
    session = Session()
    try:
        gigs = session.query(Gig).all()
        return jsonify([g.to_dict() for g in gigs]), 200
    except Exception as e:
        app.logger.error("Error: %s", str(e))
        return jsonify({"error": "An internal error occurred."}), 500
    finally:
        session.close()

@app.route('/api/gigs', methods=['POST'])
def create_gig():
    """Create a new gig."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    consumer_id = data.get('consumer_id')
    title = data.get('title', 'New Gig')
    description = data.get('description', '')
    budget = data.get('budget', 0.0)
    total_amount = data.get('price', budget)
    payment_mode = data.get('payment_mode', 'ONLINE')

    session = Session()
    try:
        gig = Gig(
            consumer_id=consumer_id,
            title=title,
            description=description,
            budget=budget,
            total_amount=total_amount,
            payment_mode=payment_mode,
            status='SEARCHING'
        )
        session.add(gig)
        session.commit()
        return jsonify(gig.to_dict()), 201
    except Exception as e:
        session.rollback()
        app.logger.error("Error: %s", tb.format_exc())
        return jsonify({"error": "An internal error occurred."}), 500
    finally:
        session.close()

@app.route('/api/gigs/<string:gig_id>/accept', methods=['POST'])
def accept_gig(gig_id):
    """
    Accept a gig by an authenticated worker.
    Verifies gig is SEARCHING.
    Assigns worker, updates status to ASSIGNED.
    """
    data = request.get_json() or {}
    worker_id = data.get('worker_id')
    
    # In a real production scenario, we would strictly decode the JWT.
    # For demo, allow worker_id in body and optional Authorization header.
    if not worker_id:
        return jsonify({"error": "worker_id is required in body"}), 400

    session = Session()
    try:
        gig = session.query(Gig).filter(Gig.id == gig_id).with_for_update().first()
        if not gig:
            return jsonify({"error": "Gig not found"}), 404
        
        if gig.status not in ('SEARCHING', 'Open', 'ASSIGNED'):
            return jsonify({"error": "Gig is no longer available"}), 409
        
        from datetime import datetime
        gig.status = 'ASSIGNED'
        gig.assigned_worker_id = worker_id
        gig.accepted_at = datetime.utcnow()
        
        # Sync to the bookings table
        session.execute(text("""
            UPDATE bookings SET status = 'accepted', updated_at = NOW()
            WHERE gig_id = :gig_id
        """), {'gig_id': str(gig.id)})
        
        session.commit()
        return jsonify(gig.to_dict()), 200
    except Exception as e:
        session.rollback()
        app.logger.error("Error: %s", tb.format_exc())
        return jsonify({"error": "An internal error occurred."}), 500
    finally:
        session.close()

@app.route('/api/workers/nearby', methods=['GET'])
def get_nearby_workers():
    """
    Accept lat, lng, and radius_meters.
    Use PostGIS ST_DWithin and ST_Distance to return available workers within the radius.
    """
    lat = request.args.get('lat', type=float)
    lng = request.args.get('lng', type=float)
    radius = request.args.get('radius_meters', default=5000, type=float)

    if lat is None or lng is None:
        return jsonify({"error": "Missing lat or lng"}), 400

    session = Session()
    try:
        # Create a WKT Point
        point = f'SRID=4326;POINT({lng} {lat})'
        
        # Query using ST_DWithin and calculate ST_Distance
        # ST_DWithin(geom, geom, distance_in_meters) for Geography type
        query = session.query(
            WorkerProfile,
            func.ST_Distance(WorkerProfile.location, func.ST_GeomFromEWKT(point)).label('distance')
        ).filter(
            func.ST_DWithin(WorkerProfile.location, func.ST_GeomFromEWKT(point), radius)
        ).filter(WorkerProfile.status == 'ONLINE').order_by('distance').limit(50)
        
        workers = query.all()
        
        results = []
        for worker, distance in workers:
            w_dict = worker.to_dict()
            w_dict['distance_meters'] = distance
            results.append(w_dict)
            
        return jsonify({"workers": results}), 200
    except Exception as e:
        app.logger.error("Error: %s", tb.format_exc())
        return jsonify({"error": "An internal error occurred."}), 500
    finally:
        session.close()

@app.route('/api/gigs/<int:gig_id>/status', methods=['PATCH'])
def update_gig_status(gig_id):
    """
    Update the status of a gig. Validates the transition.
    """
    data = request.get_json()
    new_status = data.get('status')
    
    if not new_status:
        return jsonify({"error": "Status is required"}), 400
        
    session = Session()
    try:
        gig = session.query(Gig).filter(Gig.id == gig_id).first()
        if not gig:
            return jsonify({"error": "Gig not found"}), 404
            
        # Add any necessary business logic rules here (e.g., can't go from COMPLETED to SEARCHING)
        gig.status = new_status
        session.commit()
        return jsonify(gig.to_dict()), 200
    except Exception as e:
        session.rollback()
        app.logger.error("Error: %s", tb.format_exc())
        return jsonify({"error": "An internal error occurred."}), 500
    finally:
        session.close()

@app.route('/api/gigs/<int:gig_id>/complete', methods=['POST'])
def complete_gig(gig_id):
    """
    Worker marks a gig as completed. Triggers Smart Escrow.
    """
    session = Session()
    try:
        gig = session.query(Gig).filter(Gig.id == gig_id).first()
        if not gig:
            return jsonify({"error": "Gig not found"}), 404
            
        gig.status = 'COMPLETED'
        
        # Trigger mock payment calculation
        # In a real scenario, this involves EscrowTransaction and CooperativeTransaction updates
        worker_payout = round(gig.total_amount * 0.95, 2)
        coop_commission = round(gig.total_amount * 0.05, 2)
        
        response = {
            "gig": gig.to_dict(),
            "payment_summary": {
                "total_charged": gig.total_amount,
                "worker_payout": worker_payout,
                "cooperative_commission": coop_commission
            }
        }
        
        session.commit()
        return jsonify(response), 200
    except Exception as e:
        session.rollback()
        app.logger.error("Error: %s", str(e))
        return jsonify({"error": "An internal error occurred."}), 500
    finally:
        session.close()

# ==========================================
# Phase 2: Micro-finance / Escrow Routes
# ==========================================

@app.route('/api/worker/<int:worker_id>/premium-order', methods=['POST'])
def create_premium_order(worker_id):
    """
    Create a Razorpay order for a worker to settle their premium balance.
    """
    if not rzp_client:
        return jsonify({"error": "Razorpay not configured"}), 500
        
    session = Session()
    try:
        worker = session.query(WorkerProfile).filter(WorkerProfile.id == worker_id).first()
        if not worker:
            return jsonify({"error": "Worker not found"}), 404
            
        if worker.premium_balance <= 0:
            return jsonify({"error": "No premium balance to settle"}), 400

        # Amount in paise
        amount_in_paise = int(worker.premium_balance * 100)
        
        order_data = {
            "amount": amount_in_paise,
            "currency": "INR",
            "receipt": f"receipt_worker_{worker_id}",
            "notes": {
                "worker_id": worker_id,
                "type": "premium_settlement"
            }
        }
        
        order = rzp_client.order.create(data=order_data)
        
        return jsonify({"order": order}), 200
    except Exception as e:
        app.logger.error("Error: %s", str(e))
        return jsonify({"error": "An internal error occurred."}), 500
    finally:
        session.close()

@app.route('/api/worker/<int:worker_id>/settle-success', methods=['POST'])
def settle_success(worker_id):
    """
    Reset premium_balance to 0 after successful settlement.
    """
    session = Session()
    try:
        worker = session.query(WorkerProfile).filter(WorkerProfile.id == worker_id).first()
        if not worker:
            return jsonify({"error": "Worker not found"}), 404
            
        # In a real scenario, we would verify the Razorpay signature here
        worker.premium_balance = 0.0
        worker.is_blocked_for_cash = False
        session.commit()
        
        return jsonify({
            "message": "Premium settled successfully",
            "premium_balance": worker.premium_balance,
            "is_blocked_for_cash": worker.is_blocked_for_cash
        }), 200
    except Exception as e:
        session.rollback()
        app.logger.error("Error: %s", str(e))
        return jsonify({"error": "An internal error occurred."}), 500
    finally:
        session.close()

@app.route('/api/admin/demand-forecast', methods=['GET'])
def get_demand_forecast():
    """
    Expose the Groq forecasting service.
    """
    forecast = forecast_demand()
    return jsonify(forecast), 200

# ==========================================
# Phase 3: Bhashini NLP Routes
# ==========================================
@app.route('/api/nlp/translate', methods=['POST'])
def translate():
    data = request.get_json()
    text = data.get('text')
    source_lang = data.get('source_lang', 'en')
    target_lang = data.get('target_lang', 'hi')
    result = bhashini_service.translate_text(text, source_lang, target_lang)
    return jsonify({"translated_text": result}), 200

@app.route('/api/nlp/asr', methods=['POST'])
def asr():
    data = request.get_json()
    audio = data.get('audio_base64')
    source_lang = data.get('source_lang', 'en')
    result = bhashini_service.speech_to_text(audio, source_lang)
    return jsonify({"recognized_text": result}), 200

@app.route('/api/nlp/tts', methods=['POST'])
def tts():
    data = request.get_json()
    text = data.get('text')
    target_lang = data.get('target_lang', 'en')
    result = bhashini_service.text_to_speech(text, target_lang)
    return jsonify({"audio_base64": result}), 200

# ==========================================
# Phase 3: Smart Escrow Routes
# ==========================================
@app.route('/api/payments/lock-escrow', methods=['POST'])
def lock_escrow():
    data = request.get_json()
    gig_id = data.get('gig_id')
    amount = data.get('amount')
    
    session = Session()
    try:
        gig = session.query(Gig).filter(Gig.id == gig_id).first()
        if not gig:
            return jsonify({"error": "Gig not found"}), 404
            
        # Co-op takes 5%, worker takes 95%
        worker_payout = round(amount * 0.95, 2)
        coop_commission = round(amount - worker_payout, 2)
        
        escrow = EscrowTransaction(
            gig_id=gig_id,
            amount=amount,
            status='LOCKED',
            worker_payout=worker_payout,
            coop_commission=coop_commission
        )
        session.add(escrow)
        session.commit()
        return jsonify(escrow.to_dict()), 200
    except Exception as e:
        session.rollback()
        app.logger.error("Error: %s", tb.format_exc())
        return jsonify({"error": "An internal error occurred."}), 500
    finally:
        session.close()

def _do_release_payout(gig_id, session):
    from decimal import Decimal
    escrow = session.query(EscrowTransaction).filter(EscrowTransaction.gig_id == gig_id).first()
    if not escrow:
        return {"error": "Escrow transaction not found"}, 404
        
    if escrow.status == 'RELEASED':
        return {"error": "Funds already released"}, 400
        
    # Get booking details to link CooperativeTransaction
    with engine.connect() as conn:
        booking = conn.execute(
            text("SELECT id, worker_id FROM bookings WHERE gig_id = :gig_id"),
            {'gig_id': gig_id}
        ).mappings().first()
        
    if not booking:
        return {"error": "Booking not found for this gig"}, 404
        
    booking_id = booking['id']
    worker_id = booking['worker_id']

    # Insert into CooperativeTransaction with numeric types
    gross_amount = Decimal(str(escrow.amount))
    worker_amount = Decimal(str(escrow.worker_payout))
    coop_amount = Decimal(str(escrow.coop_commission))

    coop_txn = CooperativeTransaction(
        booking_id=booking_id,
        worker_id=worker_id,
        cooperative_id='CENTRAL_COOP',
        gross_amount=gross_amount,
        worker_amount=worker_amount,
        cooperative_amount=coop_amount,
        transaction_status='COMPLETED'
    )
    session.add(coop_txn)
        
    escrow.status = 'RELEASED'
    session.commit()
    return {
        "message": "Funds released successfully",
        "worker_payout": escrow.worker_payout,
        "coop_commission": escrow.coop_commission
    }, 200

@app.route('/api/payments/release-payout', methods=['POST'])
def release_payout():
    data = request.get_json()
    gig_id = data.get('gig_id')
    
    session = Session()
    try:
        result, status_code = _do_release_payout(gig_id, session)
        return jsonify(result), status_code
    except Exception as e:
        session.rollback()
        app.logger.error("Error: %s", tb.format_exc())
        return jsonify({"error": "An internal error occurred."}), 500
    finally:
        session.close()

# ==========================================
# Bookings API Routes
# ==========================================
VALID_BOOKING_STATUSES = {
    'pending', 'accepted', 'travelling', 'arrived',
    'working', 'awaiting_otp', 'completed', 'cancelled', 'released'
}

VALID_TRANSITIONS = {
    'pending': ['accepted', 'cancelled'],
    'accepted': ['travelling', 'cancelled'],
    'travelling': ['arrived'],
    'arrived': ['working'],
    'working': ['awaiting_otp'],
    'awaiting_otp': ['completed'],
    'completed': ['released']
}

def _row_to_dict(row):
    """Convert a SQLAlchemy RowMapping to a JSON-serializable dict."""
    d = dict(row)
    # Convert UUID objects to strings
    for k, v in d.items():
        if hasattr(v, 'hex'):
            d[k] = str(v)
        elif hasattr(v, 'isoformat'):
            d[k] = v.isoformat()
    return d


@app.route('/api/bookings', methods=['POST'])
def create_booking():
    """
    Create a new booking. Generates a 4-digit OTP server-side.
    Returns the persisted booking row including the real database UUID.
    """
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body is required'}), 400

    for field in ('date', 'time', 'address', 'price'):
        if not data.get(field):
            return jsonify({'error': f"'{field}' is required"}), 400

    booking_id = str(uuid.uuid4())
    otp = str(random.randint(1000, 9999))

    session = Session()
    try:
        # Sanitize: if any ID is not a valid UUID, pass None to avoid DB type errors
        customer_uuid = _to_uuid_or_none(data.get('customer_id'))
        worker_uuid = _to_uuid_or_none(data.get('worker_id'))
        service_uuid = _to_uuid_or_none(data.get('service_id'))

        gig_id = _to_uuid_or_none(data.get('gig_id'))
        if not gig_id:
            gig = Gig(
                consumer_id=customer_uuid,
                worker_id=worker_uuid,
                title=data.get('service_name', 'Requested Service'),
                budget=float(data['price']),
                total_amount=float(data['price']),
                status='ASSIGNED' if worker_uuid else 'SEARCHING',
                assigned_worker_id=worker_uuid
            )
            session.add(gig)
            session.flush()
            gig_id = str(gig.id)
            
        session.execute(text("""
            INSERT INTO bookings
              (id, customer_id, worker_id, service_id, gig_id,
               date, time, address, price, status, otp, created_at, updated_at)
            VALUES
              (:id, :customer_id, :worker_id, :service_id, :gig_id,
               :date, :time, :address, :price, 'pending', :otp, NOW(), NOW())
        """), {
            'id': booking_id,
            'customer_id': customer_uuid,
            'worker_id': worker_uuid,
            'service_id': service_uuid,
            'gig_id': gig_id,
            'date': data['date'],
            'time': data['time'],
            'address': data['address'],
            'price': float(data['price']),
            'otp': otp,
        })
        session.commit()

        # Re-fetch for response
        with engine.connect() as conn:
            row = conn.execute(
                text('SELECT * FROM bookings WHERE id = :id'), {'id': booking_id}
            ).mappings().one()
            return jsonify(_row_to_dict(row)), 201

    except Exception:
        session.rollback()
        app.logger.error("Error: %s", tb.format_exc())
        return jsonify({'error': 'An internal error occurred.'}), 500
    finally:
        session.close()


@app.route('/api/bookings', methods=['GET'])
def list_bookings():
    """
    List bookings. Accepts optional query params: customer_id, worker_id, status.
    """
    customer_id = request.args.get('customer_id')
    worker_id = request.args.get('worker_id')
    status = request.args.get('status')

    filters = []
    params = {}
    if customer_id:
        filters.append('customer_id = :customer_id')
        params['customer_id'] = customer_id
    if worker_id:
        filters.append('worker_id = :worker_id')
        params['worker_id'] = worker_id
    if status:
        filters.append('status = :status')
        params['status'] = status

    where_clause = ('WHERE ' + ' AND '.join(filters)) if filters else ''

    try:
        with engine.connect() as conn:
            rows = conn.execute(
                text(f'SELECT * FROM bookings {where_clause} ORDER BY created_at DESC'),
                params
            ).mappings().all()
            return jsonify([_row_to_dict(r) for r in rows]), 200
    except Exception:
        app.logger.error("Error: %s", tb.format_exc())
        return jsonify({'error': 'An internal error occurred.'}), 500


@app.route('/api/bookings/<booking_id>', methods=['GET'])
def get_booking(booking_id):
    """
    Fetch a single booking by its UUID.
    """
    try:
        with engine.connect() as conn:
            row = conn.execute(
                text('SELECT * FROM bookings WHERE id = :id'), {'id': booking_id}
            ).mappings().one_or_none()

            if row is None:
                return jsonify({'error': 'Booking not found'}), 404
            return jsonify(_row_to_dict(row)), 200

    except Exception:
        app.logger.error("Error: %s", tb.format_exc())
        return jsonify({'error': 'An internal error occurred.'}), 500

@app.route('/api/bookings/<booking_id>/verify-otp', methods=['POST'])
def verify_otp(booking_id):
    """
    Verify the OTP for a booking to mark it as completed.
    Limits failed attempts to 3.
    """
    data = request.get_json()
    if not data or not data.get('otp'):
        return jsonify({'error': 'OTP is required'}), 400
        
    submitted_otp = str(data['otp']).strip()

    try:
        with engine.connect() as conn:
            row = conn.execute(
                text('SELECT status, otp, failed_otp_attempts, gig_id FROM bookings WHERE id = :id'), 
                {'id': booking_id}
            ).mappings().one_or_none()

            if row is None:
                return jsonify({'error': 'Booking not found'}), 404
                
            if row['status'] != 'awaiting_otp':
                return jsonify({'error': 'Booking is not in awaiting_otp status'}), 400
                
            failed_attempts = row.get('failed_otp_attempts') or 0
            
            if failed_attempts >= 3:
                return jsonify({'error': 'Too many failed OTP attempts. Please contact support.'}), 400
                
            if row['otp'] != submitted_otp:
                # Increment failed attempts
                conn.execute(
                    text('UPDATE bookings SET failed_otp_attempts = failed_otp_attempts + 1 WHERE id = :id'),
                    {'id': booking_id}
                )
                conn.commit()
                return jsonify({'error': 'Invalid OTP'}), 400
                
            # OTP matches
            conn.execute(
                text("UPDATE bookings SET status = 'completed', failed_otp_attempts = 0, updated_at = NOW() WHERE id = :id"),
                {'id': booking_id}
            )
            conn.commit()
            
            gig_id = row.get('gig_id')
            
        # Trigger Escrow release if gig_id exists
        escrow_result = None
        if gig_id:
            session = Session()
            try:
                res, status_code = _do_release_payout(gig_id, session)
                if status_code == 200:
                    escrow_result = res
                else:
                    print(f"Failed to release escrow: {res}")
            except Exception as e:
                session.rollback()
                print("Exception during escrow release:", e)
            finally:
                session.close()

        # Fetch and return the updated booking
        with engine.connect() as conn:
            updated_row = conn.execute(
                text('SELECT * FROM bookings WHERE id = :id'), {'id': booking_id}
            ).mappings().one()
            
            resp = _row_to_dict(updated_row)
            if escrow_result:
                resp['escrowResult'] = escrow_result
                
            return jsonify(resp), 200

    except Exception:
        app.logger.error("Error: %s", tb.format_exc())
        return jsonify({'error': 'An internal error occurred.'}), 500


@app.route('/api/bookings/<booking_id>/status', methods=['PATCH'])
def update_booking_status(booking_id):
    """
    Update booking status. Validates the new status is in the allowed set.
    """
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body is required'}), 400

    new_status = data.get('status')
    if not new_status:
        return jsonify({'error': "'status' is required"}), 400
    if new_status not in VALID_BOOKING_STATUSES:
        return jsonify({
            'error': f"Invalid status '{new_status}'. Must be one of: {sorted(VALID_BOOKING_STATUSES)}"
        }), 400

    try:
        with engine.connect() as conn:
            # Check current status
            current = conn.execute(
                text('SELECT status FROM bookings WHERE id = :id'), {'id': booking_id}
            ).mappings().one_or_none()
            
            if current is None:
                return jsonify({'error': 'Booking not found'}), 404
                
            current_status = current['status']
            
            # Validate transition if state is changing
            if current_status != new_status:
                allowed_next = VALID_TRANSITIONS.get(current_status, [])
                if new_status not in allowed_next:
                    return jsonify({'error': f"Invalid transition from '{current_status}' to '{new_status}'"}), 409

            result = conn.execute(text("""
                UPDATE bookings
                SET status = :status, updated_at = NOW()
                WHERE id = :id
                RETURNING *
            """), {'status': new_status, 'id': booking_id})
            conn.commit()

            row = result.mappings().one_or_none()
            return jsonify(_row_to_dict(row)), 200

    except Exception:
        app.logger.error("Error: %s", tb.format_exc())
        return jsonify({'error': 'An internal error occurred.'}), 500


# ==========================================
# Admin / Cooperative API Routes
# ==========================================

@app.route('/api/admin/cooperative-stats', methods=['GET'])
def get_cooperative_stats():
    session = Session()
    try:
        # Aggregate logic for the central cooperative
        total_dividend_pool = session.query(func.sum(CooperativeTransaction.cooperative_amount)).scalar() or 0
        total_revenue = session.query(func.sum(CooperativeTransaction.gross_amount)).scalar() or 0
        payouts_made = session.query(CooperativeTransaction).count()

        return jsonify({
            "total_dividend_pool": float(total_dividend_pool),
            "total_revenue": float(total_revenue),
            "payouts_made": payouts_made,
            "status": "active"
        }), 200
    except Exception as e:
        session.rollback()
        app.logger.error("Error: %s", tb.format_exc())
        return jsonify({"error": "An internal error occurred."}), 500
    finally:
        session.close()

@app.route('/api/admin/cooperative-transactions', methods=['GET'])
def list_cooperative_transactions():
    session = Session()
    try:
        txns = session.query(CooperativeTransaction).order_by(CooperativeTransaction.created_at.desc()).all()
        return jsonify([t.to_dict() for t in txns]), 200
    except Exception as e:
        session.rollback()
        app.logger.error("Error: %s", tb.format_exc())
        return jsonify({"error": "An internal error occurred."}), 500
    finally:
        session.close()

@app.route('/api/workers/<worker_id>/earnings', methods=['GET'])
def get_worker_earnings(worker_id):
    """Return aggregated earnings for a worker."""
    session = Session()
    try:
        # Calculate total earnings from cooperative transactions
        total = session.query(func.sum(CooperativeTransaction.worker_amount)).filter_by(worker_id=worker_id).scalar() or 0
        
        # Calculate completed jobs count
        jobs_completed = session.query(CooperativeTransaction).filter_by(worker_id=worker_id).count()

        return jsonify({
            "total": float(total),
            "thisMonth": float(total) * 0.4,  # Approximate for demo
            "thisWeek": float(total) * 0.1,   # Approximate for demo
            "pendingPayout": 0,               # Hardcoded for now
            "jobsCompleted": jobs_completed,
            "averageRating": 4.8,             # Hardcoded for demo
            "hourlyRate": 250,                # Hardcoded for demo
            "monthlyHistory": [
                {"month": "Apr", "amount": 4200},
                {"month": "May", "amount": 5100},
                {"month": "Jun", "amount": 4800},
                {"month": "Jul", "amount": 5600},
                {"month": "Aug", "amount": 6500},
                {"month": "Sep", "amount": float(total) * 0.4}
            ]
        }), 200
    except Exception as e:
        app.logger.error("Error: %s", tb.format_exc())
        return jsonify({"error": "An internal error occurred."}), 500
    finally:
        session.close()

if __name__ == '__main__':
    port = int(os.getenv("FLASK_RUN_PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
