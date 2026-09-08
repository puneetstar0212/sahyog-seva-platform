-- Fix worker registration so it works with Supabase email confirmation.
-- Safe/idempotent: does not delete users or existing worker profiles.

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
  -- Support both old and new frontend metadata names.
  requested_role := COALESCE(
    NEW.raw_user_meta_data->>'role',
    NEW.raw_user_meta_data->>'requested_role',
    'customer'
  );

  -- Never permit public signup to create an admin.
  safe_role := CASE
    WHEN lower(requested_role) = 'worker' THEN 'worker'
    ELSE 'customer'
  END;

  INSERT INTO public.profiles (id, email, full_name, role, phone, address)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    safe_role,
    NULLIF(NEW.raw_user_meta_data->>'phone', ''),
    NULLIF(NEW.raw_user_meta_data->>'address', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    full_name = CASE
      WHEN EXCLUDED.full_name <> '' THEN EXCLUDED.full_name
      ELSE public.profiles.full_name
    END,
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
    address = COALESCE(EXCLUDED.address, public.profiles.address),
    role = CASE
      WHEN public.profiles.role = 'admin' THEN 'admin'
      ELSE EXCLUDED.role
    END;

  IF safe_role = 'worker' THEN
    meta_skills := COALESCE(NEW.raw_user_meta_data->>'skills', '');
    meta_experience := COALESCE(NEW.raw_user_meta_data->>'experience_years', '0');
    meta_hourly_rate := COALESCE(NEW.raw_user_meta_data->>'hourly_rate', '0');
    meta_working_hours := NULLIF(NEW.raw_user_meta_data->>'working_hours', '');

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
        ELSE ARRAY(
          SELECT trim(value)
          FROM unnest(string_to_array(meta_skills, ',')) AS value
          WHERE trim(value) <> ''
        )
      END,
      parsed_experience,
      parsed_hourly_rate,
      meta_working_hours,
      'pending'
    )
    ON CONFLICT (user_id) DO UPDATE SET
      skills = CASE
        WHEN array_length(public.worker_profiles.skills, 1) IS NULL
             AND array_length(EXCLUDED.skills, 1) IS NOT NULL
        THEN EXCLUDED.skills
        ELSE public.worker_profiles.skills
      END,
      experience_years = CASE
        WHEN public.worker_profiles.experience_years = 0
        THEN EXCLUDED.experience_years
        ELSE public.worker_profiles.experience_years
      END,
      hourly_rate = CASE
        WHEN public.worker_profiles.hourly_rate = 0
        THEN EXCLUDED.hourly_rate
        ELSE public.worker_profiles.hourly_rate
      END,
      working_hours = COALESCE(public.worker_profiles.working_hours, EXCLUDED.working_hours);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Repair existing worker accounts that have no worker_profiles row.
INSERT INTO public.worker_profiles (
  user_id, skills, experience_years, hourly_rate, working_hours, approval_status
)
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

-- Verify with:
-- SELECT p.id, p.email, p.full_name, p.role,
--        wp.id AS worker_profile_id, wp.approval_status,
--        wp.skills, wp.experience_years, wp.hourly_rate, wp.working_hours
-- FROM public.profiles p
-- LEFT JOIN public.worker_profiles wp ON wp.user_id = p.id
-- WHERE p.role = 'worker'
-- ORDER BY p.created_at DESC;
