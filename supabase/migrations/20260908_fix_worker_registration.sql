-- Fix: ensure worker_profiles exists even when Supabase email confirmation
-- means auth.signUp() returns data.session = NULL.
-- Safe/idempotent migration: does not delete existing data.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  requested_role TEXT;
  safe_role TEXT;
  meta_skills TEXT;
  meta_experience TEXT;
  meta_hourly_rate TEXT;
  meta_working_hours TEXT;
  parsed_experience INT;
  parsed_hourly_rate NUMERIC(8,2);
BEGIN
  requested_role := COALESCE(NEW.raw_user_meta_data->>'role', 'customer');

  -- Public signup may only create customer or worker accounts.
  -- Never allow metadata to create an admin account.
  safe_role := CASE
    WHEN requested_role = 'worker' THEN 'worker'
    ELSE 'customer'
  END;

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    safe_role
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = CASE
      WHEN EXCLUDED.full_name <> '' THEN EXCLUDED.full_name
      ELSE public.profiles.full_name
    END,
    role = CASE
      WHEN public.profiles.role = 'admin' THEN 'admin'
      ELSE EXCLUDED.role
    END;

  -- IMPORTANT: this runs as SECURITY DEFINER, so it also works when
  -- email confirmation is enabled and the browser has no authenticated session.
  IF safe_role = 'worker' THEN
    meta_skills := COALESCE(NEW.raw_user_meta_data->>'skills', '');
    meta_experience := COALESCE(NEW.raw_user_meta_data->>'experience_years', '0');
    meta_hourly_rate := COALESCE(NEW.raw_user_meta_data->>'hourly_rate', '0');
    meta_working_hours := NULLIF(NEW.raw_user_meta_data->>'working_hours', '');

    -- Reject malformed numeric metadata safely instead of failing the auth trigger.
    IF meta_experience ~ '^\d+$' THEN
      parsed_experience := meta_experience::INT;
    ELSE
      parsed_experience := 0;
    END IF;

    IF meta_hourly_rate ~ '^\d+(\.\d+)?$' THEN
      parsed_hourly_rate := meta_hourly_rate::NUMERIC(8,2);
    ELSE
      parsed_hourly_rate := 0;
    END IF;

    INSERT INTO public.worker_profiles (
      user_id,
      skills,
      experience_years,
      hourly_rate,
      working_hours,
      approval_status
    )
    VALUES (
      NEW.id,
      CASE
        WHEN meta_skills = '' THEN ARRAY[]::TEXT[]
        ELSE string_to_array(meta_skills, ',')
      END,
      parsed_experience,
      parsed_hourly_rate,
      meta_working_hours,
      'pending'
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill worker_profiles for any existing worker accounts that were created
-- before this fix but are missing their worker profile.
INSERT INTO public.worker_profiles (user_id, skills, experience_years, hourly_rate, working_hours, approval_status)
SELECT
  p.id,
  ARRAY[]::TEXT[],
  0,
  0,
  NULL,
  'pending'
FROM public.profiles p
LEFT JOIN public.worker_profiles wp ON wp.user_id = p.id
WHERE p.role = 'worker'
  AND wp.user_id IS NULL;

-- Diagnostic query (run separately if desired):
-- SELECT p.id, p.email, p.full_name, p.role, wp.id AS worker_profile_id,
--        wp.approval_status, wp.created_at
-- FROM public.profiles p
-- LEFT JOIN public.worker_profiles wp ON wp.user_id = p.id
-- WHERE p.role = 'worker'
-- ORDER BY p.created_at DESC;
