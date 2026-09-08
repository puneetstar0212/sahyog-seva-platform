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

@app.route('/', methods=['GET'])
def index():
    return jsonify({"message": "Sahyog Seva Backend API is running", "docs": "Use /api endpoints"}), 200

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"}), 200

@app.route('/api/gigs', methods=['GET'])
def get_gigs():
    """Return all open gigs from the database."""
    try:
        with engine.connect() as conn:
            # Join gigs with bookings and profiles to get extra details expected by the frontend
            query = text("""
                SELECT g.*, 
                       b.date, b.time, b.address, b.price as booking_price, 
                       p.full_name as client_name
                FROM gigs g
                LEFT JOIN bookings b ON g.id = b.gig_id::uuid
                LEFT JOIN profiles p ON g.consumer_id = p.id
            """)
            rows = conn.execute(query).mappings().all()
            
            result = []
            for r in rows:
                d = dict(r)
                # Ensure UUIDs/DateTimes are strings
                for k, v in d.items():
                    if hasattr(v, 'hex'):
                        d[k] = str(v)
                    elif hasattr(v, 'isoformat'):
                        d[k] = v.isoformat()
                
                # Map extra fields for frontend UI
                gig_dict = {
                    'id': d.get('id'),
                    'consumer_id': d.get('consumer_id'),
                    'clientId': d.get('consumer_id') or 'c1',
                    'worker_id': d.get('worker_id'),
                    'title': d.get('title'),
                    'serviceName': d.get('title') or 'Requested Service',
                    'description': d.get('description'),
                    'budget': d.get('budget'),
                    'status': d.get('status'),
                    'total_amount': d.get('total_amount'),
                    'payment_mode': d.get('payment_mode'),
                    'assigned_worker_id': d.get('assigned_worker_id'),
                    'accepted_at': d.get('accepted_at'),
                    'created_at': d.get('created_at'),
                    'date': d.get('date') or 'Flexible',
                    'time': d.get('time') or 'Flexible',
                    'address': d.get('address') or 'TBD',
                    'price': float(d.get('booking_price') or d.get('total_amount') or d.get('budget') or 0),
                    'clientName': d.get('client_name') or 'Customer',
                    'clientImage': d.get('client_image') or f"https://ui-avatars.com/api/?name={d.get('client_name') or 'Customer'}",
                    'distance': '2.5 km',
                    'duration': '1-2 hrs',
                }
                result.append(gig_dict)
                
            return jsonify(result), 200
    except Exception as e:
        app.logger.error("Error: %s", str(e))
        return jsonify({"error": "An internal error occurred."}), 500

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
    'accepted': ['travelling', 'working', 'cancelled'],
    'travelling': ['arrived', 'working'],
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
            
    if 'price' in d and d['price'] is not None:
        try:
            gross = float(d['price'])
            worker_payout = round(gross * 0.95, 2)
            coop_contribution = round(gross - worker_payout, 2)
            d['price_breakdown'] = {
                'gross_amount': gross,
                'worker_payout': worker_payout,
                'cooperative_contribution': coop_contribution
            }
        except ValueError:
            pass
            
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

    DEV BYPASS (temporary): set DEV_OTP_BYPASS=true in backend/.env to accept
    any numeric OTP so the full flow can be tested without the real OTP.
    Remove before production.
    """
    data = request.get_json()
    if not data or not data.get('otp'):
        return jsonify({'error': 'OTP is required'}), 400
        
    submitted_otp = str(data['otp']).strip()

    # DEV BYPASS: accepts any OTP when DEV_OTP_BYPASS=true in .env
    dev_bypass = os.getenv('DEV_OTP_BYPASS', 'false').lower() == 'true'

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

            if failed_attempts >= 3 and not dev_bypass:
                return jsonify({'error': 'Too many failed OTP attempts. Please contact support.'}), 400

            # OTP check: real in production, bypassed in dev mode
            otp_valid = dev_bypass or (row['otp'] == submitted_otp)

            if not otp_valid:
                # Increment failed attempts
                conn.execute(
                    text('UPDATE bookings SET failed_otp_attempts = failed_otp_attempts + 1 WHERE id = :id'),
                    {'id': booking_id}
                )
                conn.commit()
                return jsonify({'error': 'Invalid OTP'}), 400
                
            # OTP accepted (real match or dev bypass)
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


# Known area keywords to extract from free-text addresses.
# Order matters: more-specific strings should come first.
_KNOWN_AREAS = [
    'Bandra West', 'Bandra East', 'Andheri West', 'Andheri East',
    'Dadar', 'Juhu', 'Goregaon', 'Malad', 'Borivali', 'Kandivali',
    'Thane', 'Navi Mumbai', 'Powai', 'Chembur', 'Kurla',
    'Worli', 'Lower Parel', 'Parel', 'Matunga', 'Sion',
]

# Hard-coded short service IDs (s1-s9) → display category.
_SERVICE_ID_MAP = {
    's1': 'Electrical',
    's2': 'Plumbing',
    's3': 'Carpentry',
    's4': 'Painting',
    's5': 'Cleaning',
    's6': 'Driving',
    's7': 'Outdoor',
    's8': 'Caregiving',
    's9': 'Domestic',
}

# Map skill/service_id keywords → display category.
# Individual skill keywords (from worker_profiles.skills array) included.
_SERVICE_CATEGORY_MAP = {
    # Electrical
    'electrical': 'Electrical',
    'electric':   'Electrical',
    'wiring':     'Electrical',
    'repair':     'Electrical',
    'installation': 'Electrical',
    # Plumbing
    'plumbing':   'Plumbing',
    'plumber':    'Plumbing',
    'pipes':      'Plumbing',
    'pipe':       'Plumbing',
    'fittings':   'Plumbing',
    'leaks':      'Plumbing',
    # Carpentry
    'carpentry':  'Carpentry',
    'carpenter':  'Carpentry',
    'furniture':  'Carpentry',
    'doors':      'Carpentry',
    # Painting
    'painting':   'Painting',
    'painter':    'Painting',
    'decorative': 'Painting',
    'interior':   'Painting',
    'exterior':   'Painting',
    # Cleaning
    'cleaning':   'Cleaning',
    'cleaner':    'Cleaning',
    'deep clean': 'Cleaning',
    'kitchen':    'Cleaning',
    'bathroom':   'Cleaning',
    # Driving
    'driving':    'Driving',
    'driver':     'Driving',
    'local':      'Driving',
    'delivery':   'Driving',
    'personal':   'Driving',
    # Outdoor / Gardening
    'garden':     'Outdoor',
    'outdoor':    'Outdoor',
    'lawn':       'Outdoor',
    'pruning':    'Outdoor',
    'landscaping': 'Outdoor',
    # Caregiving
    'caregiving': 'Caregiving',
    'caregiv':    'Caregiving',
    'elderly':    'Caregiving',
    'nursing':    'Caregiving',
    'companion':  'Caregiving',
    # Domestic
    'domestic':   'Domestic',
    'cooking':    'Domestic',
    'laundry':    'Domestic',
    'test':       'Other',
}

def _extract_area(address: str) -> str:
    """Return the first known area found in the address string, else 'Other'."""
    if not address:
        return 'Other'
    addr_lower = address.lower()
    for area in _KNOWN_AREAS:
        if area.lower() in addr_lower:
            return area
    return 'Other'

def _normalise_category(raw: str) -> str:
    """Map a raw service_id or skill string to a display category.

    Resolution order:
    1. Exact match in _SERVICE_ID_MAP  (handles 's1', 's2' … 's9', 'gig')
    2. Keyword substring in _SERVICE_CATEGORY_MAP  (handles skill tags)
    3. Capitalise first word as a fallback
    """
    if not raw or not raw.strip():
        return 'Other'
    raw_stripped = raw.strip()
    # 1. Exact service-ID lookup (case-insensitive)
    mapped = _SERVICE_ID_MAP.get(raw_stripped.lower())
    if mapped:
        return mapped
    # 2. Keyword match on the full string
    raw_lower = raw_stripped.lower()
    for keyword, category in _SERVICE_CATEGORY_MAP.items():
        if keyword in raw_lower:
            return category
    # 3. Fallback: capitalise first word
    return raw_stripped.split()[0].capitalize()

def _scale_to_100(value: int, max_val: int) -> int:
    """Scale value proportionally so the largest bucket = 100."""
    if max_val == 0:
        return 0
    return min(100, round(value * 100 / max_val))

def _gap_status(gap: int) -> str:
    if gap >= 30:
        return 'Critical'
    if gap >= 20:
        return 'High'
    if gap >= 10:
        return 'Moderate'
    return 'Balanced'


@app.route('/api/admin/demand-heatmap', methods=['GET'])
def get_demand_heatmap():
    """
    Aggregate real booking demand and approved worker supply by category × area.
    Returns JSON array of DemandCell objects matching the frontend type:
      { area, category, demand, supply, gap, status, booking_count, worker_count }

    Query params:
      from_date  – ISO date string (YYYY-MM-DD), default = 90 days ago
      to_date    – ISO date string (YYYY-MM-DD), default = today
    """
    from datetime import date, timedelta
    from collections import defaultdict

    # ── Date range ──────────────────────────────────────────────────────────
    raw_from = request.args.get('from_date')
    raw_to   = request.args.get('to_date')
    try:
        from_date = date.fromisoformat(raw_from) if raw_from else date.today() - timedelta(days=90)
        to_date   = date.fromisoformat(raw_to)   if raw_to   else date.today()
    except ValueError:
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD.'}), 400

    try:
        with engine.connect() as conn:
            # ── 1. Demand: count bookings by (service_id, address) ──────────
            demand_rows = conn.execute(text("""
                SELECT
                    service_id,
                    address,
                    COUNT(*) AS booking_count
                FROM bookings
                WHERE created_at::date BETWEEN :from_date AND :to_date
                  AND status NOT IN ('cancelled')
                GROUP BY service_id, address
            """), {'from_date': from_date, 'to_date': to_date}).mappings().all()

            # ── 2. Supply: approved workers by skill ─────────────────────────
            supply_rows = conn.execute(text("""
                SELECT
                    unnest(skills) AS skill,
                    COUNT(*) AS worker_count
                FROM worker_profiles
                WHERE approval_status = 'approved'
                GROUP BY skill
            """)).mappings().all()

        # ── Aggregate demand into (area, category) buckets ──────────────────
        demand_buckets = defaultdict(int)   # (area, category) -> count
        for row in demand_rows:
            area     = _extract_area(row['address'])
            category = _normalise_category(row['service_id'] or '')
            demand_buckets[(area, category)] += int(row['booking_count'])

        # ── Aggregate supply into category buckets ───────────────────────────
        supply_by_category = defaultdict(int)  # category -> worker_count
        for row in supply_rows:
            category = _normalise_category(row['skill'] or '')
            supply_by_category[category] += int(row['worker_count'])

        # ── Build all (area, category) pairs present in either source ────────
        all_pairs = set(demand_buckets.keys())
        # Also add area × category pairs for all areas that have any demand
        areas_with_demand = {k[0] for k in demand_buckets}
        for area in areas_with_demand:
            for category in supply_by_category:
                all_pairs.add((area, category))

        if not all_pairs:
            return jsonify([]), 200

        # ── Scaling: find max demand and max worker count for normalisation ──
        max_demand = max((demand_buckets[p] for p in all_pairs), default=1) or 1
        max_supply = max(supply_by_category.values(), default=1) or 1

        # ── Build result cells ───────────────────────────────────────────────
        cells = []
        for (area, category) in sorted(all_pairs):
            raw_demand = demand_buckets.get((area, category), 0)
            raw_supply = supply_by_category.get(category, 0)

            # Skip empty rows (no demand AND no supply in this cell)
            if raw_demand == 0 and raw_supply == 0:
                continue

            demand_pct = _scale_to_100(raw_demand, max_demand)
            supply_pct = _scale_to_100(raw_supply, max_supply)
            gap        = max(0, demand_pct - supply_pct)
            status     = _gap_status(gap)

            cells.append({
                'area':          area,
                'category':      category,
                'demand':        demand_pct,
                'supply':        supply_pct,
                'gap':           gap,
                'status':        status,
                'booking_count': raw_demand,
                'worker_count':  raw_supply,
            })

        # Sort: Critical first, then High, then by gap descending
        status_order = {'Critical': 0, 'High': 1, 'Moderate': 2, 'Balanced': 3}
        cells.sort(key=lambda c: (status_order.get(c['status'], 9), -c['gap']))

        return jsonify({
            'cells':       cells,
            'from_date':   from_date.isoformat(),
            'to_date':     to_date.isoformat(),
            'data_source': 'Actual bookings and approved worker profiles',
            'total_cells': len(cells),
        }), 200

    except Exception:
        app.logger.error("Error in demand-heatmap: %s", tb.format_exc())
        return jsonify({'error': 'An internal error occurred.'}), 500


@app.route('/api/workers/<worker_id>/earnings', methods=['GET'])
def get_worker_earnings(worker_id):
    """
    Return aggregated earnings for a worker.
    Primary source: bookings table (completed/released bookings for this worker).
    Secondary source: cooperative_transactions (if escrow has been released).
    """
    from datetime import date, timedelta
    from collections import defaultdict
    import calendar

    try:
        with engine.connect() as conn:
            # ── 1. Earnings from completed/released bookings ─────────────────
            bookings_rows = conn.execute(text("""
                SELECT
                    price,
                    status,
                    created_at,
                    updated_at
                FROM bookings
                WHERE worker_id = :worker_id
                  AND status IN ('completed', 'released', 'awaiting_otp', 'working', 'arrived', 'travelling', 'accepted')
                ORDER BY created_at DESC
            """), {'worker_id': worker_id}).mappings().all()

            # ── 2. Released escrow amounts ────────────────────────────────────
            coop_rows = conn.execute(text("""
                SELECT worker_amount, created_at
                FROM cooperative_transactions
                WHERE worker_id = :worker_id
                ORDER BY created_at DESC
            """), {'worker_id': worker_id}).mappings().all()

        # ── Aggregate totals ──────────────────────────────────────────────────
        now = date.today()
        month_start = now.replace(day=1)
        week_start  = now - timedelta(days=now.weekday())

        total_coop = sum(float(r['worker_amount']) for r in coop_rows)
        total_bookings = sum(float(r['price']) for r in bookings_rows if r['status'] in ('completed', 'released'))

        # Use cooperative_transactions if available; fall back to booking prices
        total = total_coop if total_coop > 0 else total_bookings

        # Completed jobs = bookings where status is completed or released
        jobs_completed = sum(1 for r in bookings_rows if r['status'] in ('completed', 'released'))
        # Also count from coop if higher
        jobs_completed = max(jobs_completed, len(coop_rows))

        # Monthly totals from bookings
        month_totals_bookings = defaultdict(float)
        for r in bookings_rows:
            if r['status'] not in ('completed', 'released'):
                continue
            ts = r['updated_at'] or r['created_at']
            if ts:
                d = ts.date() if hasattr(ts, 'date') else date.fromisoformat(str(ts)[:10])
                key = d.strftime('%b')  # e.g. 'Sep'
                month_totals_bookings[key] += float(r['price'])

        # Monthly totals from cooperative_transactions
        month_totals_coop = defaultdict(float)
        for r in coop_rows:
            ts = r['created_at']
            if ts:
                d = ts.date() if hasattr(ts, 'date') else date.fromisoformat(str(ts)[:10])
                key = d.strftime('%b')
                month_totals_coop[key] += float(r['worker_amount'])

        # Merge: prefer coop if available
        month_totals = month_totals_coop if month_totals_coop else month_totals_bookings

        # Build last 6 months history
        history = []
        for i in range(5, -1, -1):
            target = date(now.year, now.month, 1) - timedelta(days=i * 28)
            # clamp to valid month
            target = target.replace(day=1)
            label = target.strftime('%b')
            history.append({'month': label, 'amount': month_totals.get(label, 0)})

        # thisMonth — sum all bookings/coop in the current month
        this_month_amount = month_totals.get(now.strftime('%b'), 0)

        # pendingPayout — sum of 'completed' bookings not yet 'released'
        pending = sum(
            float(r['price']) for r in bookings_rows
            if r['status'] == 'completed'
        )

        # thisWeek — bookings completed in the current week
        this_week_amount = 0.0
        for r in bookings_rows:
            if r['status'] not in ('completed', 'released'):
                continue
            ts = r['updated_at'] or r['created_at']
            if ts:
                d = ts.date() if hasattr(ts, 'date') else date.fromisoformat(str(ts)[:10])
                if d >= week_start:
                    this_week_amount += float(r['price'])

        hourly_rate = 250  # default (worker can set via profile)


        return jsonify({
            "total":          round(total, 2),
            "thisMonth":      round(this_month_amount, 2),
            "thisWeek":       round(this_week_amount, 2),
            "pendingPayout":  round(pending, 2),
            "jobsCompleted":  jobs_completed,
            "averageRating":  4.8,
            "hourlyRate":     hourly_rate,
            "monthlyHistory": history,
        }), 200

    except Exception:
        app.logger.error("Error in get_worker_earnings: %s", tb.format_exc())
        return jsonify({"error": "An internal error occurred."}), 500


if __name__ == '__main__':
    port = int(os.getenv("FLASK_RUN_PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
