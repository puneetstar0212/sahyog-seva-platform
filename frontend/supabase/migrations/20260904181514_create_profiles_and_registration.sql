/*
# Create profiles, customer_profiles, and worker_profiles tables with admin approval flow

## Purpose
This migration sets up the account system for Sahyog Seva. It creates a unified
`profiles` table linked to Supabase auth.users, plus two extension tables:
`customer_profiles` for clients and `worker_profiles` for service providers.
Worker profiles include an admin-controlled approval status so the admin can
approve or reject newly registered workers before they appear in the marketplace.

## New Tables

### profiles (one row per auth user)
- `id` uuid PK, references auth.users ON DELETE CASCADE
- `email` text NOT NULL (denormalised from auth.users for convenience)
- `full_name` text NOT NULL
- `phone` text
- `address` text
- `role` text NOT NULL DEFAULT 'customer' — 'customer' | 'worker' | 'admin'
- `created_at` timestamptz DEFAULT now()

### customer_profiles
- `id` uuid PK DEFAULT gen_random_uuid()
- `user_id` uuid NOT NULL, references profiles ON DELETE CASCADE, UNIQUE
- `created_at` timestamptz DEFAULT now()

### worker_profiles
- `id` uuid PK DEFAULT gen_random_uuid()
- `user_id` uuid NOT NULL, references profiles ON DELETE CASCADE, UNIQUE
- `skills` text[] DEFAULT '{}'
- `experience_years` int DEFAULT 0
- `hourly_rate` int DEFAULT 0
- `working_hours` text
- `approval_status` text NOT NULL DEFAULT 'pending' — 'pending' | 'approved' | 'rejected'
- `admin_notes` text
- `reviewed_by` uuid, references profiles ON DELETE SET NULL
- `reviewed_at` timestamptz
- `created_at` timestamptz DEFAULT now()

## Security

### RLS
- `profiles`: users can SELECT/UPDATE their own row; admins can SELECT all.
  Column-level: users cannot change their own `role` (revoked from authenticated,
  only the `set_user_role` SECURITY DEFINER function can change it).
- `customer_profiles`: owner-scoped CRUD.
- `worker_profiles`: owner can SELECT/INSERT their own row; admins can SELECT all
  and update approval fields via the `approve_worker` SECURITY DEFINER function.
  The `approval_status`, `admin_notes`, `reviewed_by`, and `reviewed_at` columns
  are revoked from authenticated UPDATE so workers cannot self-approve.

### Functions
- `set_user_role(p_user_id uuid, p_role text)` — SECURITY DEFINER, admin-only,
  sets a user's role. Used during initial admin provisioning.
- `approve_worker(p_worker_id uuid, p_status text, p_notes text)` — SECURITY DEFINER,
  admin-only, sets a worker's approval_status to 'approved' or 'rejected'.

## Notes
1. Email confirmation is OFF (per project convention).
2. The `profiles` table is populated by the frontend immediately after signUp.
3. Admin role is assigned via the `set_user_role` function or directly in the
   database for the first admin account.
4. All policies use `auth.uid()` — never `current_user`.
*/

-- ─── profiles ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  phone text,
  address text,
  role text NOT NULL DEFAULT 'customer',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON profiles;
CREATE POLICY "profiles_select_own_or_admin"
ON profiles FOR SELECT
TO authenticated
USING (
  auth.uid() = id
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Revoke UPDATE on the role column so users cannot self-elevate
REVOKE UPDATE ON profiles FROM authenticated;
GRANT UPDATE (full_name, phone, address) ON profiles TO authenticated;

-- ─── customer_profiles ────────────────────────────────────
CREATE TABLE IF NOT EXISTS customer_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customer_profiles_select_own" ON customer_profiles;
CREATE POLICY "customer_profiles_select_own"
ON customer_profiles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "customer_profiles_insert_own" ON customer_profiles;
CREATE POLICY "customer_profiles_insert_own"
ON customer_profiles FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "customer_profiles_update_own" ON customer_profiles;
CREATE POLICY "customer_profiles_update_own"
ON customer_profiles FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "customer_profiles_delete_own" ON customer_profiles;
CREATE POLICY "customer_profiles_delete_own"
ON customer_profiles FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ─── worker_profiles ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS worker_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  skills text[] NOT NULL DEFAULT '{}',
  experience_years int NOT NULL DEFAULT 0,
  hourly_rate int NOT NULL DEFAULT 0,
  working_hours text,
  approval_status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE worker_profiles ENABLE ROW LEVEL SECURITY;

-- Workers can read their own; admins can read all
DROP POLICY IF EXISTS "worker_profiles_select_own_or_admin" ON worker_profiles;
CREATE POLICY "worker_profiles_select_own_or_admin"
ON worker_profiles FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- Workers can insert their own (during registration)
DROP POLICY IF EXISTS "worker_profiles_insert_own" ON worker_profiles;
CREATE POLICY "worker_profiles_insert_own"
ON worker_profiles FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Workers can update their own editable columns (NOT approval_status etc.)
DROP POLICY IF EXISTS "worker_profiles_update_own" ON worker_profiles;
CREATE POLICY "worker_profiles_update_own"
ON worker_profiles FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Revoke UPDATE on admin-controlled columns
REVOKE UPDATE ON worker_profiles FROM authenticated;
GRANT UPDATE (skills, experience_years, hourly_rate, working_hours) ON worker_profiles TO authenticated;

-- ─── Functions ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_user_role(p_user_id uuid, p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_role NOT IN ('customer', 'worker', 'admin') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;

  UPDATE profiles SET role = p_role WHERE id = p_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION set_user_role FROM anon;
GRANT EXECUTE ON FUNCTION set_user_role TO authenticated;

CREATE OR REPLACE FUNCTION approve_worker(p_worker_id uuid, p_status text, p_notes text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_status NOT IN ('approved', 'rejected', 'pending') THEN
    RAISE EXCEPTION 'Invalid approval status';
  END IF;

  UPDATE worker_profiles
  SET approval_status = p_status,
      admin_notes = p_notes,
      reviewed_by = auth.uid(),
      reviewed_at = now()
  WHERE user_id = p_worker_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION approve_worker FROM anon;
GRANT EXECUTE ON FUNCTION approve_worker TO authenticated;

-- ─── Indexes ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_worker_profiles_approval_status ON worker_profiles(approval_status);
