-- Fix validate_invitation_code to properly detect CSV profile data
-- The issue is that checking "v_csv_profile IS NOT NULL" doesn't work reliably for RECORD types
-- Instead, we need to check if a specific field has a value

CREATE OR REPLACE FUNCTION public.validate_invitation_code(p_code text, p_email text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation RECORD;
  v_profile_exists boolean;
  v_has_auth_account boolean;
  v_csv_first_name text;
  v_csv_last_name text;
  v_csv_phone text;
  v_csv_site_id uuid;
  v_csv_site_name text;
  v_csv_job_title_id uuid;
  v_csv_job_title_name text;
BEGIN
  -- Check if the invitation code exists and is valid
  SELECT ic.*, o.name as org_name, o.onboarding_complete
  INTO v_invitation
  FROM invitation_codes ic
  LEFT JOIN organisations o ON ic.organisation_id = o.id
  WHERE ic.code = p_code
    AND ic.is_active = true
    AND (ic.expires_at IS NULL OR ic.expires_at > now())
    AND ic.used_count < ic.max_uses;

  IF v_invitation IS NULL THEN
    RETURN json_build_object('valid', false, 'error', 'Invalid or expired invitation code');
  END IF;

  -- If email-linked, verify the email matches
  IF v_invitation.email IS NOT NULL AND lower(v_invitation.email) != lower(p_email) THEN
    RETURN json_build_object('valid', false, 'error', 'This invitation code is linked to a different email address');
  END IF;

  -- Check if profile exists
  v_profile_exists := check_profile_exists_by_email(p_email);

  -- Check if the user already has an auth account
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE lower(email) = lower(p_email)
  ) INTO v_has_auth_account;

  -- If profile exists but no auth account, this is a CSV-enrolled user
  -- Fetch their pre-filled data
  IF v_profile_exists AND NOT v_has_auth_account THEN
    SELECT 
      p.first_name,
      p.last_name,
      p.phone,
      p.primary_site_id,
      s.name,
      p.job_title_id,
      jt.name
    INTO 
      v_csv_first_name,
      v_csv_last_name,
      v_csv_phone,
      v_csv_site_id,
      v_csv_site_name,
      v_csv_job_title_id,
      v_csv_job_title_name
    FROM profiles p
    LEFT JOIN sites s ON p.primary_site_id = s.id
    LEFT JOIN job_titles jt ON p.job_title_id = jt.id
    WHERE lower(p.email) = lower(p_email)
      AND (
        (v_invitation.organisation_id IS NOT NULL AND p.organisation_id = v_invitation.organisation_id)
        OR (v_invitation.organisation_id IS NULL AND p.organisation_id IS NOT NULL)
      );
  END IF;

  -- Return result with CSV profile data if found
  IF v_profile_exists AND NOT v_has_auth_account AND v_csv_first_name IS NOT NULL THEN
    RETURN json_build_object(
      'valid', true,
      'organisation_id', v_invitation.organisation_id,
      'organisation_name', v_invitation.org_name,
      'onboarding_complete', COALESCE(v_invitation.onboarding_complete, false),
      'is_email_linked', v_invitation.email IS NOT NULL,
      'profile_exists', v_profile_exists,
      'has_auth_account', v_has_auth_account,
      'csv_profile', json_build_object(
        'first_name', v_csv_first_name,
        'last_name', v_csv_last_name,
        'phone', v_csv_phone,
        'primary_site_id', v_csv_site_id,
        'primary_site_name', v_csv_site_name,
        'job_title_id', v_csv_job_title_id,
        'job_title_name', v_csv_job_title_name
      )
    );
  END IF;

  -- Standard return without CSV profile
  RETURN json_build_object(
    'valid', true,
    'organisation_id', v_invitation.organisation_id,
    'organisation_name', v_invitation.org_name,
    'onboarding_complete', COALESCE(v_invitation.onboarding_complete, false),
    'is_email_linked', v_invitation.email IS NOT NULL,
    'profile_exists', v_profile_exists,
    'has_auth_account', v_has_auth_account
  );
END;
$$;