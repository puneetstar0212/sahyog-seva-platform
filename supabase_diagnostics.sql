-- ============================================================
-- SIH26089: Sahyog Seva — Database Diagnostics
-- Run individual queries in Supabase Dashboard → SQL Editor
-- ============================================================

-- ── 1. All registered workers ──────────────────────────────────────────────
SELECT
  p.id,
  p.email,
  p.full_name,
  p.phone,
  p.address,
  p.role,
  wp.id AS worker_profile_id,
  wp.user_id,
  wp.skills,
  wp.experience_years,
  wp.hourly_rate,
  wp.working_hours,
  wp.approval_status,
  wp.created_at
FROM public.profiles p
LEFT JOIN public.worker_profiles wp ON wp.user_id = p.id
WHERE p.role = 'worker'
ORDER BY wp.created_at DESC;


-- ── 2. Admin accounts ──────────────────────────────────────────────────────
SELECT
  id,
  email,
  full_name,
  role
FROM public.profiles
WHERE role = 'admin';


-- ── 3. Total worker_profiles count ────────────────────────────────────────
SELECT COUNT(*) AS total_worker_profiles
FROM public.worker_profiles;


-- ── 4. Pending workers (what admin should see) ────────────────────────────
SELECT
  p.email,
  p.full_name,
  p.phone,
  wp.skills,
  wp.experience_years,
  wp.hourly_rate,
  wp.approval_status,
  wp.created_at
FROM public.worker_profiles wp
JOIN public.profiles p ON p.id = wp.user_id
WHERE wp.approval_status = 'pending'
ORDER BY wp.created_at DESC;


-- ── 5. Duplicate worker profiles (should return 0 rows) ───────────────────
SELECT
  user_id,
  COUNT(*) AS count
FROM public.worker_profiles
GROUP BY user_id
HAVING COUNT(*) > 1;


-- ── 6. Active RLS policies on worker_profiles ─────────────────────────────
SELECT
  policyname,
  cmd,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE tablename = 'worker_profiles'
ORDER BY policyname;


-- ── 7. Active RLS policies on profiles ────────────────────────────────────
SELECT
  policyname,
  cmd,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;


-- ── 8. Check is_admin() function definition ───────────────────────────────
SELECT
  proname AS function_name,
  prosecdef AS security_definer,
  proconfig AS config
FROM pg_proc
WHERE proname = 'is_admin' AND pronamespace = 'public'::regnamespace;


-- ── 9. Check approve_worker RPC exists ────────────────────────────────────
SELECT
  proname AS function_name,
  prosecdef AS security_definer
FROM pg_proc
WHERE proname = 'approve_worker' AND pronamespace = 'public'::regnamespace;


-- ── 10. Recent auth.users (most recent signups) ────────────────────────────
SELECT
  id,
  email,
  created_at,
  raw_user_meta_data->>'role' AS signup_role,
  raw_user_meta_data->>'full_name' AS signup_full_name
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;


-- ── 11. Users with profile but no worker_profile (incomplete registration) ─
SELECT
  p.id,
  p.email,
  p.full_name,
  p.role,
  p.created_at
FROM public.profiles p
LEFT JOIN public.worker_profiles wp ON wp.user_id = p.id
WHERE p.role = 'worker'
  AND wp.user_id IS NULL;
