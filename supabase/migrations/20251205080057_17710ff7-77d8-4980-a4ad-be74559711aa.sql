CREATE OR REPLACE FUNCTION public.validate_invitation_code(p_code text, p_email text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_invitation RECORD;
  v_org RECORD;
  v_profile_exists BOOLEAN;
  v_has_auth_account BOOLEAN;
  v_csv_profile RECORD;
  v_org_name TEXT;
  v_onboarding_complete BOOLEAN;
BEGIN
  -- Get invitation code
  SELECT * INTO v_invitation
  FROM invitation_codes
  WHERE code = p_code;
  
  -- Validate code exists
  IF v_invitation IS NULL THEN
    RETURN json_build_object('valid', false, 'error', 'Invitation code not recognised');
  END IF;
  
  -- Validate is_active
  IF NOT v_invitation.is_active THEN
    RETURN json_build_object('valid', false, 'error', 'This invitation code is no longer active');
  END IF;
  
  -- Validate not maxed out
  IF v_invitation.used_count >= v_invitation.max_uses THEN
    RETURN json_build_object('valid', false, 'error', 'This invitation code has already been used');
  END IF;
  
  -- Validate not expired
  IF v_invitation.expires_at IS NOT NULL AND v_invitation.expires_at < now() THEN
    RETURN json_build_object('valid', false, 'error', 'This invitation code has expired');
  END IF;
  
  -- Validate email if linked
  IF v_invitation.email IS NOT NULL AND lower(v_invitation.email) != lower(p_email) THEN
    RETURN json_build_object('valid', false, 'error', 'This invitation code is not valid for this email address');
  END IF;
  
  -- Get organisation details if org_id exists
  v_org_name := NULL;
  v_onboarding_complete := false;
  
  IF v_invitation.organisation_id IS NOT NULL THEN
    SELECT id, name, onboarding_complete INTO v_org
    FROM organisations
    WHERE id = v_invitation.organisation_id;
    
    IF v_org IS NOT NULL THEN
      v_org_name := v_org.name;
      v_onboarding_complete := COALESCE(v_org.onboarding_complete, false);
    END IF;
  END IF;
  
  -- Check if profile exists
  v_profile_exists := check_profile_exists_by_email(p_email);
  
  -- Check if profile has an auth account (CSV users won't have one)
  v_has_auth_account := false;
  IF v_profile_exists AND v_invitation.organisation_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM auth.users u 
      JOIN profiles p ON u.id = p.id 
      WHERE lower(p.email) = lower(p_email)
        AND p.organisation_id = v_invitation.organisation_id
    ) INTO v_has_auth_account;
    
    -- If profile exists but no auth account, get the CSV profile data
    IF NOT v_has_auth_account THEN
      SELECT first_name, last_name, phone, primary_site_id, job_title_id
      INTO v_csv_profile
      FROM profiles
      WHERE lower(email) = lower(p_email)
        AND organisation_id = v_invitation.organisation_id;
    END IF;
  END IF;
  
  -- Return success with all data including CSV profile if applicable
  IF v_profile_exists AND NOT v_has_auth_account AND v_csv_profile IS NOT NULL THEN
    RETURN json_build_object(
      'valid', true,
      'code', v_invitation.code,
      'organisation_id', v_invitation.organisation_id,
      'organisation_name', v_org_name,
      'onboarding_complete', v_onboarding_complete,
      'is_email_linked', v_invitation.email IS NOT NULL,
      'profile_exists', v_profile_exists,
      'has_auth_account', v_has_auth_account,
      'csv_profile', json_build_object(
        'first_name', v_csv_profile.first_name,
        'last_name', v_csv_profile.last_name,
        'phone', v_csv_profile.phone,
        'primary_site_id', v_csv_profile.primary_site_id,
        'job_title_id', v_csv_profile.job_title_id
      )
    );
  ELSE
    RETURN json_build_object(
      'valid', true,
      'code', v_invitation.code,
      'organisation_id', v_invitation.organisation_id,
      'organisation_name', v_org_name,
      'onboarding_complete', v_onboarding_complete,
      'is_email_linked', v_invitation.email IS NOT NULL,
      'profile_exists', v_profile_exists,
      'has_auth_account', COALESCE(v_has_auth_account, false)
    );
  END IF;
END;
$function$;