import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from sqlalchemy import create_engine, text, func
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import razorpay

from models import WorkerProfile, Gig, EscrowTransaction
from services.ai_service import forecast_demand
from services.bhashini_nlp import BhashiniNLPService

bhashini_service = BhashiniNLPService()

load_dotenv()

app = Flask(__name__)
CORS(app)

DATABASE_URL = os.getenv("DATABASE_URL")
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
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

@app.route('/api/gigs', methods=['POST'])
def create_gig():
    """Create a new gig."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400
    session = Session()
    try:
        gig = Gig(
            total_amount=data.get('price', 0),
            payment_mode=data.get('payment_mode', 'ONLINE'),
            status='SEARCHING',
        )
        session.add(gig)
        session.commit()
        return jsonify(gig.to_dict()), 201
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
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
        ).filter(
            WorkerProfile.is_blocked_for_cash == False
        ).order_by(text('distance')).all()

        results = []
        for worker, distance in query:
            data = worker.to_dict()
            data['distance_meters'] = round(distance, 2)
            results.append(data)
            
        return jsonify({"workers": results}), 200
    except Exception as e:
        import traceback
        return jsonify({"error": traceback.format_exc()}), 500
    finally:
        session.close()

@app.route('/api/gigs/<int:gig_id>/complete', methods=['POST'])
def complete_gig(gig_id):
    """
    Implement the SIH Cooperative welfare logic.
    If payment_mode == 'ONLINE', simulate a 5% deduction at the gateway.
    If payment_mode == 'CASH', add the 5% premium to the worker's premium_balance.
    Include the threshold check: return a specific alert payload if premium_balance >= 3000.
    """
    session = Session()
    try:
        gig = session.query(Gig).filter(Gig.id == gig_id).first()
        if not gig:
            return jsonify({"error": "Gig not found"}), 404
            
        worker = session.query(WorkerProfile).filter(WorkerProfile.id == gig.worker_id).first()
        if not worker:
            return jsonify({"error": "Worker not found"}), 404

        premium_amount = gig.total_amount * 0.05
        message = ""
        alert = False

        if gig.payment_mode == 'ONLINE':
            # Deducted at gateway automatically
            message = f"Gig completed. {premium_amount} deducted at gateway for cooperative welfare."
        elif gig.payment_mode == 'CASH':
            # Worker collected cash, so they owe the cooperative 5%
            worker.premium_balance += premium_amount
            message = f"Gig completed in CASH. {premium_amount} added to worker's cash liability."
            
            if worker.premium_balance >= 3000:
                worker.is_blocked_for_cash = True
                alert = True

        session.commit()
        
        response = {
            "message": message,
            "new_premium_balance": worker.premium_balance,
            "is_blocked_for_cash": worker.is_blocked_for_cash
        }
        
        if alert:
            response["alert"] = "CASH_LIABILITY_THRESHOLD_EXCEEDED"
            
        return jsonify(response), 200
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

@app.route('/api/worker/<int:worker_id>/pay-premium-order', methods=['POST'])
def create_premium_order(worker_id):
    """
    Create a Razorpay order for the worker to clear their cash liability wallet.
    """
    if not rzp_client:
        return jsonify({"error": "Razorpay client not configured"}), 500

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
        return jsonify({"error": str(e)}), 500
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
        return jsonify({"error": str(e)}), 500
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
        coop_commission = amount * 0.05
        worker_payout = amount * 0.95
        
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
        import traceback
        return jsonify({"error": traceback.format_exc()}), 500
    finally:
        session.close()

@app.route('/api/payments/release-payout', methods=['POST'])
def release_payout():
    data = request.get_json()
    gig_id = data.get('gig_id')
    
    session = Session()
    try:
        escrow = session.query(EscrowTransaction).filter(EscrowTransaction.gig_id == gig_id).first()
        if not escrow:
            return jsonify({"error": "Escrow transaction not found"}), 404
            
        if escrow.status == 'RELEASED':
            return jsonify({"error": "Funds already released"}), 400
            
        escrow.status = 'RELEASED'
        session.commit()
        return jsonify({
            "message": "Funds released successfully",
            "worker_payout": escrow.worker_payout,
            "coop_commission": escrow.coop_commission
        }), 200
    except Exception as e:
        session.rollback()
        import traceback
        return jsonify({"error": traceback.format_exc()}), 500
    finally:
        session.close()

if __name__ == '__main__':
    port = int(os.getenv("FLASK_RUN_PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
