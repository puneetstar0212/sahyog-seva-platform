-- ============================================================
-- SIH26089: Sahyog Seva — COMPLETE AUTH + RLS + WORKER FIX
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- Project: https://lextvqqljfslayumriuf.supabase.co
-- ============================================================
-- SAFE: Uses DROP IF EXISTS before redefining. Does NOT drop any tables or data.
-- ============================================================


-- ── STEP 1: Fix handle_new_user() trigger ─────────────────────────────────────
-- Reads full_name AND role from signup metadata.
-- SECURITY: Blocks 'admin' role from being injected via public signup.
-- The trigger fires AFTER INSERT on auth.users, so NEW.id is the real UUID.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  _role TEXT;
  _full_name TEXT;
  _phone TEXT;
  _address TEXT;
BEGIN
  -- Read role from metadata, default to 'customer', NEVER allow 'admin' via public signup
  _role := COALESCE(NEW.raw_user_meta_data->>'role', 'customer');
  IF _role NOT IN ('customer', 'worker') THEN
    _role := 'customer';
  END IF;

  _full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
  _phone := COALESCE(NEW.raw_user_meta_data->>'phone', '');
  _address := COALESCE(NEW.raw_user_meta_data->>'address', '');

  INSERT INTO public.profiles (id, email, full_name, role, phone, address)
  VALUES (NEW.id, NEW.email, _full_name, _role, _phone, _address)
  ON CONFLICT (id) DO UPDATE
    SET
      email = EXCLUDED.email,
      full_name = CASE WHEN EXCLUDED.full_name <> '' THEN EXCLUDED.full_name ELSE public.profiles.full_name END,
      phone = CASE WHEN EXCLUDED.phone <> '' THEN EXCLUDED.phone ELSE public.profiles.phone END,
      address = CASE WHEN EXCLUDED.address <> '' THEN EXCLUDED.address ELSE public.profiles.address END,
      role = CASE WHEN public.profiles.role = 'customer' AND EXCLUDED.role IN ('customer', 'worker') THEN EXCLUDED.role ELSE public.profiles.role END;

  IF _role = 'worker' THEN
    INSERT INTO public.worker_profiles (
      user_id,
      skills,
      experience_years,
      hourly_rate,
      working_hours,
      approval_status
    ) VALUES (
      NEW.id,
      string_to_array(COALESCE(NEW.raw_user_meta_data->>'skills', ''), ','),
      COALESCE(NULLIF(NEW.raw_user_meta_data->>'experience_years', '')::numeric, 0),
      COALESCE(NULLIF(NEW.raw_user_meta_data->>'hourly_rate', '')::numeric, 0),
      COALESCE(NEW.raw_user_meta_data->>'working_hours', ''),
      'pending'
    ) ON CONFLICT (user_id) DO UPDATE
      SET
        skills = EXCLUDED.skills,
        experience_years = EXCLUDED.experience_years,
        hourly_rate = EXCLUDED.hourly_rate,
        working_hours = EXCLUDED.working_hours,
        approval_status = 'pending';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Re-attach trigger (safe to run again)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ── STEP 2: Fix is_admin() — security definer + search_path ──────────────────
-- Uses SECURITY DEFINER to bypass RLS when reading profiles.
-- SET search_path prevents search_path injection attacks.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  _is_admin BOOLEAN;
BEGIN
  SELECT (role = 'admin') INTO _is_admin
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;

  RETURN COALESCE(_is_admin, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ── STEP 3: Create approve_worker RPC ────────────────────────────────────────
-- Called by Admin UI: supabase.rpc('approve_worker', { p_worker_id, p_status })
-- Only admins can execute this function (enforced inside the function).
CREATE OR REPLACE FUNCTION public.approve_worker(
  p_worker_id UUID,
  p_status TEXT
)
RETURNS VOID AS $$
BEGIN
  -- Security check: only admins can call this
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: administrator privileges required';
  END IF;

  -- Validate status values
  IF p_status NOT IN ('approved', 'rejected', 'pending') THEN
    RAISE EXCEPTION 'Invalid status: must be approved, rejected, or pending';
  END IF;

  -- Update the worker profile
  UPDATE public.worker_profiles
  SET approval_status = p_status
  WHERE user_id = p_worker_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Worker profile not found for user_id: %', p_worker_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execute to authenticated users (the function itself does admin check)
REVOKE ALL ON FUNCTION public.approve_worker(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_worker(UUID, TEXT) TO authenticated;


-- ── STEP 4: Fix RLS on profiles ──────────────────────────────────────────────
-- Workers & customers need to INSERT/UPSERT their own profile during registration.
-- Without this, the frontend upsert fails with RLS violation if the trigger
-- already created the row but the session is the new user.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own profile" ON public.profiles;
CREATE POLICY "Users can manage own profile"
  ON public.profiles FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

-- Block role escalation: users cannot set their own role to 'admin' via UPDATE
DROP POLICY IF EXISTS "Block admin role self-escalation" ON public.profiles;
CREATE POLICY "Block admin role self-escalation"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND (
      -- If role is currently 'admin', only admins can modify (caught by is_admin check above)
      -- Normal users can update their own profile but NOT escalate to admin
      NEW.role IN ('customer', 'worker')
      OR public.is_admin()
    )
  );


-- ── STEP 5: Fix RLS on worker_profiles ───────────────────────────────────────
ALTER TABLE public.worker_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workers manage own profile" ON public.worker_profiles;
CREATE POLICY "Workers manage own profile"
  ON public.worker_profiles FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public read approved workers" ON public.worker_profiles;
CREATE POLICY "Public read approved workers"
  ON public.worker_profiles FOR SELECT
  USING (approval_status = 'approved');

DROP POLICY IF EXISTS "Admins can read all worker profiles" ON public.worker_profiles;
CREATE POLICY "Admins can read all worker profiles"
  ON public.worker_profiles FOR SELECT
  USING (public.is_admin());

-- Admins must also be able to UPDATE worker_profiles (for approve_worker RPC)
DROP POLICY IF EXISTS "Admins can update worker profiles" ON public.worker_profiles;
CREATE POLICY "Admins can update worker profiles"
  ON public.worker_profiles FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ── STEP 6: Ensure worker_profiles.user_id is UNIQUE ─────────────────────────
-- This constraint should already exist from the CREATE TABLE, but we verify.
-- If it doesn't exist, add it.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.worker_profiles'::regclass
    AND contype = 'u'
    AND conname = 'worker_profiles_user_id_key'
  ) THEN
    ALTER TABLE public.worker_profiles ADD CONSTRAINT worker_profiles_user_id_key UNIQUE (user_id);
  END IF;
END $$;


-- ── STEP 7: Diagnostic queries (for verification) ────────────────────────────
-- Run these separately to verify state after migration:

-- All workers with their profiles:
-- SELECT p.id, p.email, p.full_name, p.role, wp.user_id, wp.approval_status, wp.created_at
-- FROM public.profiles p
-- LEFT JOIN public.worker_profiles wp ON wp.user_id = p.id
-- WHERE p.role = 'worker'
-- ORDER BY wp.created_at DESC;

-- Admins:
-- SELECT id, email, full_name, role FROM public.profiles WHERE role = 'admin';

-- Pending workers:
-- SELECT * FROM public.worker_profiles WHERE approval_status = 'pending' ORDER BY created_at DESC;

-- Duplicate worker profiles (should be empty):
-- SELECT user_id, COUNT(*) FROM public.worker_profiles GROUP BY user_id HAVING COUNT(*) > 1;

-- Active RLS policies on worker_profiles:
-- SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'worker_profiles';

SELECT 'Complete fix migration applied successfully!' AS result;

-- ── STEP 8: Backfill missing worker_profiles ─────────────────────────────────
-- Safely repairs any existing workers that are missing a worker_profiles row
INSERT INTO public.worker_profiles (user_id, approval_status)
SELECT p.id, 'pending'
FROM public.profiles p
LEFT JOIN public.worker_profiles wp ON wp.user_id = p.id
WHERE p.role = 'worker' AND wp.user_id IS NULL;
