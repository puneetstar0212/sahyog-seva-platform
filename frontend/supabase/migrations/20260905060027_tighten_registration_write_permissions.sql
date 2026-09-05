/*
# Tighten registration write permissions

## Purpose
This follow-up migration closes two account-registration privilege gaps:
1. New accounts may register only as customers or workers, never as admins.
2. Worker applicants may submit only their editable profile details; approval
   fields remain controlled by the admin-only approval function.

## Security changes
- Replaces the profiles INSERT policy with a role allowlist excluding admin.
- Revokes broad INSERT privileges from profiles and worker_profiles.
- Grants only the columns needed during registration.
- Adds an auth.uid() default for worker_profiles.user_id so ownership comes
  from the signed-in session instead of the browser payload.
*/

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id AND role IN ('customer', 'worker'));

REVOKE INSERT ON profiles FROM authenticated;
GRANT INSERT (id, email, full_name, phone, address, role) ON profiles TO authenticated;

ALTER TABLE worker_profiles ALTER COLUMN user_id SET DEFAULT auth.uid();
REVOKE INSERT ON worker_profiles FROM authenticated;
GRANT INSERT (skills, experience_years, hourly_rate, working_hours) ON worker_profiles TO authenticated;

DROP POLICY IF EXISTS "worker_profiles_insert_own" ON worker_profiles;
CREATE POLICY "worker_profiles_insert_own"
ON worker_profiles FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());
