import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
import uuid

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor(cursor_factory=RealDictCursor)

try:
    # Disable RLS on profiles for testing
    cur.execute("ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;")
    
    # Generate some fixed UUIDs to link things properly
    user1_id = str(uuid.uuid4())
    user2_id = str(uuid.uuid4())
    worker1_id = str(uuid.uuid4())

    # 1. Insert Profiles (Users)
    cur.execute("""
        INSERT INTO auth.users (id, email) VALUES 
        (%s, 'customer1@example.com'),
        (%s, 'customer2@example.com'),
        (%s, 'worker1@example.com')
        ON CONFLICT (id) DO NOTHING;
    """, (user1_id, user2_id, worker1_id))

    cur.execute("""
        INSERT INTO public.profiles (id, email, full_name, role, kyc_status) VALUES
        (%s, 'customer1@example.com', 'Aarav Patel', 'customer', 'VERIFIED'),
        (%s, 'customer2@example.com', 'Priya Sharma', 'customer', 'PENDING'),
        (%s, 'worker1@example.com', 'Rajesh Kumar', 'worker', 'VERIFIED')
        ON CONFLICT (id) DO NOTHING;
    """, (user1_id, user2_id, worker1_id))

    # 2. Insert Worker Profiles (Integer ID based)
    cur.execute("""
        INSERT INTO public.worker_profiles (name, premium_balance, is_blocked_for_cash) VALUES
        ('Rajesh Kumar', 0.00, false)
        RETURNING id;
    """)
    worker_int_id = cur.fetchone()['id']

    # 3. Insert Gigs
    cur.execute("""
        INSERT INTO public.gigs (worker_id, title, description, budget, status, payment_mode, total_amount) VALUES
        (%s, 'Fix bathroom sink leak', 'Water is dripping from the hot water valve.', 500.00, 'In Progress', 'ONLINE', 500.00)
        RETURNING id;
    """, (worker_int_id,))
    gig_int_id = cur.fetchone()['id']

    cur.execute("""
        INSERT INTO public.gigs (worker_id, title, description, budget, status, payment_mode, total_amount) VALUES
        (%s, 'Install new ceiling fan', 'Need a licensed electrician to install a new fan in the living room.', 800.00, 'Open', 'CASH', 800.00)
        RETURNING id;
    """, (worker_int_id,))
    
    # 4. Insert Escrow
    cur.execute("""
        INSERT INTO public.escrow_transactions (gig_id, amount, worker_payout, coop_commission, status) VALUES
        (%s, 500.00, 475.00, 25.00, 'LOCKED')
        ON CONFLICT DO NOTHING;
    """, (gig_int_id,))

    conn.commit()
    print("Database seeded with realistic test data for all tabs!")

except Exception as e:
    print(f"Error seeding data: {e}")
    conn.rollback()
finally:
    cur.close()
    conn.close()
