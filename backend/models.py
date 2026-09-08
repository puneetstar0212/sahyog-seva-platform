from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, text, Numeric
from sqlalchemy.orm import declarative_base, relationship
from geoalchemy2 import Geography
from datetime import datetime
from sqlalchemy.dialects.postgresql import UUID
import uuid

Base = declarative_base()

class WorkerProfile(Base):
    __tablename__ = 'worker_profiles'

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    # Using Geography to support distance queries in meters using WGS 84 (SRID 4326)
    location = Column(Geography(geometry_type='POINT', srid=4326))
    
    # Welfare / Cash Liability fields
    premium_balance = Column(Float, default=0.00)
    last_settlement_date = Column(DateTime, default=datetime.utcnow)
    is_blocked_for_cash = Column(Boolean, default=False)
    
    
    # We remove gigs relationship here since gigs worker_id points to profiles.id now in Supabase.

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'premium_balance': self.premium_balance,
            'last_settlement_date': self.last_settlement_date.isoformat() if self.last_settlement_date else None,
            'is_blocked_for_cash': self.is_blocked_for_cash
        }


class Gig(Base):
    __tablename__ = 'gigs'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    consumer_id = Column(UUID(as_uuid=True), nullable=True)
    worker_id = Column(UUID(as_uuid=True), nullable=True)
    title = Column(String, nullable=False, default='')
    description = Column(String, default='')
    budget = Column(Float, default=0.00)
    status = Column(String, nullable=False, default='SEARCHING')
    payment_mode = Column(String(20), nullable=False, default='ONLINE') # 'CASH' or 'ONLINE'
    total_amount = Column(Float, nullable=False, default=0.00)
    assigned_worker_id = Column(UUID(as_uuid=True), nullable=True)
    accepted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Note: Relationships might need adjustment if profiles model exists, but assuming it's unmapped in this file
    # we can define it simply or omit relationship definitions if they are not used.

    def to_dict(self):
        return {
            'id': str(self.id),
            'consumer_id': str(self.consumer_id) if self.consumer_id else None,
            'worker_id': str(self.worker_id) if self.worker_id else None,
            'title': self.title,
            'description': self.description,
            'budget': self.budget,
            'status': self.status,
            'total_amount': self.total_amount,
            'payment_mode': self.payment_mode,
            'assigned_worker_id': str(self.assigned_worker_id) if self.assigned_worker_id else None,
            'accepted_at': self.accepted_at.isoformat() if self.accepted_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class EscrowTransaction(Base):
    __tablename__ = 'escrow_transactions'

    id = Column(Integer, primary_key=True, autoincrement=True)
    gig_id = Column(UUID(as_uuid=True), ForeignKey('gigs.id'), nullable=False, unique=True)
    amount = Column(Float, nullable=False)
    status = Column(String(20), default='IDLE') # 'IDLE', 'LOCKED', 'RELEASED'
    worker_payout = Column(Float, nullable=False)
    coop_commission = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'gig_id': self.gig_id,
            'amount': self.amount,
            'status': self.status,
            'worker_payout': self.worker_payout,
            'coop_commission': self.coop_commission
        }

class CooperativeTransaction(Base):
    __tablename__ = 'cooperative_transactions'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    booking_id = Column(UUID(as_uuid=True), nullable=False, unique=True, index=True)
    worker_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    cooperative_id = Column(String(50), nullable=False, index=True, default='CENTRAL_COOP')
    gross_amount = Column(Numeric(10, 2), nullable=False)
    worker_amount = Column(Numeric(10, 2), nullable=False)
    cooperative_amount = Column(Numeric(10, 2), nullable=False)
    transaction_status = Column(String(20), default='COMPLETED')
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    def to_dict(self):
        return {
            'id': str(self.id),
            'booking_id': str(self.booking_id),
            'worker_id': str(self.worker_id),
            'cooperative_id': self.cooperative_id,
            'gross_amount': self.gross_amount,
            'worker_amount': self.worker_amount,
            'cooperative_amount': self.cooperative_amount,
            'transaction_status': self.transaction_status,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

def setup_database(engine):
    """
    Ensure the PostGIS extension exists and create tables.
    """
    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))
        conn.commit()
    
    Base.metadata.create_all(engine)
