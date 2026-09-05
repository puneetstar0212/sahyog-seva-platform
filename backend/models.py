from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, text
from sqlalchemy.orm import declarative_base, relationship
from geoalchemy2 import Geography
from datetime import datetime

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
    
    gigs = relationship('Gig', back_populates='worker')

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

    id = Column(Integer, primary_key=True, autoincrement=True)
    worker_id = Column(Integer, ForeignKey('worker_profiles.id'), nullable=False)
    total_amount = Column(Float, nullable=False)
    payment_mode = Column(String(20), nullable=False) # 'CASH' or 'ONLINE'
    created_at = Column(DateTime, default=datetime.utcnow)

    worker = relationship('WorkerProfile', back_populates='gigs')
    escrow = relationship('EscrowTransaction', back_populates='gig', uselist=False)

    def to_dict(self):
        return {
            'id': self.id,
            'worker_id': self.worker_id,
            'total_amount': self.total_amount,
            'payment_mode': self.payment_mode,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class EscrowTransaction(Base):
    __tablename__ = 'escrow_transactions'

    id = Column(Integer, primary_key=True, autoincrement=True)
    gig_id = Column(Integer, ForeignKey('gigs.id'), nullable=False, unique=True)
    amount = Column(Float, nullable=False)
    status = Column(String(20), default='IDLE') # 'IDLE', 'LOCKED', 'RELEASED'
    worker_payout = Column(Float, nullable=False)
    coop_commission = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    gig = relationship('Gig', back_populates='escrow')

    def to_dict(self):
        return {
            'id': self.id,
            'gig_id': self.gig_id,
            'amount': self.amount,
            'status': self.status,
            'worker_payout': self.worker_payout,
            'coop_commission': self.coop_commission
        }

def setup_database(engine):
    """
    Ensure the PostGIS extension exists and create tables.
    """
    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))
        conn.commit()
    
    Base.metadata.create_all(engine)
