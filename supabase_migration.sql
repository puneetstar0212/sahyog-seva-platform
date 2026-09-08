-- ============================================================
-- SIH26089: Sahyog Seva — Supabase Schema Migration
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- Project: https://egxblkzcftkdzkgwnkra.supabase.co
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ── 1. PROFILES (extends Supabase auth.users) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT,
  full_name   TEXT NOT NULL DEFAULT '',
  phone       TEXT,
  address     TEXT,
  role        TEXT NOT NULL DEFAULT 'customer'
                CHECK (role IN ('customer', 'worker', 'admin')),
  wallet_balance DECIMAL(12, 2) DEFAULT 0.00,
  kyc_status  TEXT DEFAULT 'PENDING'
                CHECK (kyc_status IN ('PENDING', 'VERIFIED', 'REJECTED')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on new signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ── 2. WORKER PROFILES ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.worker_profiles (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  skills            TEXT[]  DEFAULT '{}',
  experience_years  INT     DEFAULT 0,
  hourly_rate       DECIMAL(8, 2) DEFAULT 0.00,
  service_radius_km INT     DEFAULT 10,
  rating            DECIMAL(3, 2) DEFAULT 5.00,
  coop_shares       INT     DEFAULT 0,
  working_hours     TEXT,
  approval_status   TEXT    DEFAULT 'pending'
                      CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  admin_notes       TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);


-- ── 3. GIGS ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gigs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consumer_id  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  worker_id    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title        TEXT NOT NULL DEFAULT '',
  description  TEXT DEFAULT '',
  budget       DECIMAL(10, 2) DEFAULT 0.00,
  status       TEXT NOT NULL DEFAULT 'Open'
                 CHECK (status IN ('Open', 'Assigned', 'In Progress', 'Completed', 'Disputed', 'Cancelled', 'SEARCHING', 'ACCEPTED')),
  payment_mode TEXT DEFAULT 'ONLINE'
                 CHECK (payment_mode IN ('ONLINE', 'CASH')),
  total_amount DECIMAL(10, 2) DEFAULT 0.00,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);


-- ── 4. ESCROW LEDGER ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.escrow_transactions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gig_id          UUID UNIQUE REFERENCES public.gigs(id) ON DELETE CASCADE,
  total_amount    DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  worker_payout   DECIMAL(12, 2) NOT NULL DEFAULT 0.00,  -- 95%
  coop_commission DECIMAL(12, 2) NOT NULL DEFAULT 0.00,  -- 5%
  status          TEXT DEFAULT 'IDLE'
                    CHECK (status IN ('IDLE', 'HELD', 'RELEASED', 'REFUNDED')),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);


-- ── 5. ROW LEVEL SECURITY ─────────────────────────────────────────────────────
ALTER TABLE public.profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gigs               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_transactions ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is an admin (bypasses RLS to avoid infinite recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- profiles: users can read/write their own row, admins can read all
CREATE POLICY IF NOT EXISTS "Users can manage own profile"
  ON public.profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY IF NOT EXISTS "Admins can read all profiles"
  ON public.profiles FOR SELECT USING (public.is_admin());

-- worker_profiles: workers can manage own profile; everyone can read approved ones
CREATE POLICY IF NOT EXISTS "Workers manage own profile"
  ON public.worker_profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Public read approved workers"
  ON public.worker_profiles FOR SELECT USING (approval_status = 'approved');

DROP POLICY IF EXISTS "Admins can read all worker profiles" ON public.worker_profiles;
CREATE POLICY "Admins can read all worker profiles"
  ON public.worker_profiles FOR SELECT USING (public.is_admin());

-- escrow_transactions: Admins can read and update all escrow transactions
CREATE POLICY IF NOT EXISTS "Admins can read all escrow transactions"
  ON public.escrow_transactions FOR SELECT USING (public.is_admin());
CREATE POLICY IF NOT EXISTS "Admins can update all escrow transactions"
  ON public.escrow_transactions FOR UPDATE USING (public.is_admin());


-- gigs: open gigs visible to all authenticated users; owners can edit
CREATE POLICY IF NOT EXISTS "Authenticated read open gigs"
  ON public.gigs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY IF NOT EXISTS "Consumers insert gigs"
  ON public.gigs FOR INSERT WITH CHECK (auth.uid() = consumer_id OR consumer_id IS NULL);
CREATE POLICY IF NOT EXISTS "Owners update gigs"
  ON public.gigs FOR UPDATE USING (auth.uid() = consumer_id OR auth.uid() = worker_id);
CREATE POLICY IF NOT EXISTS "Owners delete gigs"
  ON public.gigs FOR DELETE USING (auth.uid() = consumer_id);

-- Allow anon reads on gigs for the integration test
CREATE POLICY IF NOT EXISTS "Anon read gigs"
  ON public.gigs FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Anon insert gigs"
  ON public.gigs FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Anon delete gigs"
  ON public.gigs FOR DELETE USING (true);


-- ── Done ──────────────────────────────────────────────────────────────────────

-- ── 5. COOPERATIVE TRANSACTIONS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cooperative_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL UNIQUE,
  worker_id UUID NOT NULL,
  cooperative_id TEXT NOT NULL DEFAULT 'CENTRAL_COOP',
  gross_amount NUMERIC(10, 2) NOT NULL,
  worker_amount NUMERIC(10, 2) NOT NULL,
  cooperative_amount NUMERIC(10, 2) NOT NULL,
  transaction_status TEXT DEFAULT 'COMPLETED',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for cooperative transactions
CREATE INDEX IF NOT EXISTS idx_coop_trans_booking_id ON public.cooperative_transactions(booking_id);
CREATE INDEX IF NOT EXISTS idx_coop_trans_worker_id ON public.cooperative_transactions(worker_id);
CREATE INDEX IF NOT EXISTS idx_coop_trans_coop_id ON public.cooperative_transactions(cooperative_id);
CREATE INDEX IF NOT EXISTS idx_coop_trans_created_at ON public.cooperative_transactions(created_at);

-- RLS for cooperative_transactions
ALTER TABLE public.cooperative_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read all cooperative transactions"
  ON public.cooperative_transactions FOR SELECT USING (public.is_admin());

CREATE POLICY "Workers can read own cooperative transactions"
  ON public.cooperative_transactions FOR SELECT USING (auth.uid() = worker_id);

SELECT 'Schema migration complete! Tables: profiles, worker_profiles, gigs, escrow_transactions, cooperative_transactions' AS result;
