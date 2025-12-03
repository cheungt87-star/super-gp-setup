-- Update validate_invitation_code to return has_auth_account and CSV profile data
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
  IF v_invitation.organisation_id IS NOT NULL THEN
    SELECT id, name, onboarding_complete INTO v_org
    FROM organisations
    WHERE id = v_invitation.organisation_id;
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
      'organisation_name', v_org.name,
      'onboarding_complete', COALESCE(v_org.onboarding_complete, false),
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
      'organisation_name', v_org.name,
      'onboarding_complete', COALESCE(v_org.onboarding_complete, false),
      'is_email_linked', v_invitation.email IS NOT NULL,
      'profile_exists', v_profile_exists,
      'has_auth_account', COALESCE(v_has_auth_account, false)
    );
  END IF;
END;
$function$;

-- Update handle_new_user trigger to handle CSV-enrolled users
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_org_id uuid;
  v_org_name text;
  v_invite_code text;
  v_invite_code_id uuid;
  v_role app_role;
  v_primary_site_id uuid;
  v_job_title_id uuid;
  v_existing_profile_id uuid;
BEGIN
  -- Get data from user metadata
  v_org_name := NEW.raw_user_meta_data ->> 'organisation_name';
  v_invite_code := NEW.raw_user_meta_data ->> 'invitation_code';
  v_primary_site_id := NULLIF(NEW.raw_user_meta_data ->> 'primary_site_id', '')::uuid;
  v_job_title_id := NULLIF(NEW.raw_user_meta_data ->> 'job_title_id', '')::uuid;

  -- Get the invitation code record
  SELECT id, organisation_id INTO v_invite_code_id, v_org_id
  FROM public.invitation_codes
  WHERE code = v_invite_code;

  -- If the invitation code doesn't have an org yet, create one
  IF v_org_id IS NULL AND v_org_name IS NOT NULL THEN
    -- Create the new organisation
    INSERT INTO public.organisations (name, created_from_invite_code_id)
    VALUES (v_org_name, v_invite_code_id)
    RETURNING id INTO v_org_id;
    
    -- Link the invitation code to the new organisation
    UPDATE public.invitation_codes
    SET organisation_id = v_org_id, updated_at = now()
    WHERE id = v_invite_code_id;
  END IF;

  -- Check if this is a CSV-enrolled user (profile exists with matching email and org)
  SELECT id INTO v_existing_profile_id
  FROM public.profiles
  WHERE lower(email) = lower(NEW.email)
    AND organisation_id = v_org_id;

  IF v_existing_profile_id IS NOT NULL THEN
    -- CSV-enrolled user: Update existing profile to claim it with the new auth user id
    UPDATE public.profiles
    SET id = NEW.id,
        first_name = COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'first_name', ''), first_name),
        last_name = COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'last_name', ''), last_name),
        phone = COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'phone', ''), phone),
        primary_site_id = COALESCE(v_primary_site_id, primary_site_id),
        job_title_id = COALESCE(v_job_title_id, job_title_id),
        updated_at = now()
    WHERE id = v_existing_profile_id;
  ELSE
    -- New user: Create profile with organisation, phone, site, and job title
    INSERT INTO public.profiles (id, email, first_name, last_name, phone, organisation_id, primary_site_id, job_title_id)
    VALUES (
      NEW.id,
      NEW.email,
      NEW.raw_user_meta_data ->> 'first_name',
      NEW.raw_user_meta_data ->> 'last_name',
      NEW.raw_user_meta_data ->> 'phone',
      v_org_id,
      v_primary_site_id,
      v_job_title_id
    );
  END IF;
  
  -- First user in org = admin, otherwise staff
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE organisation_id = v_org_id
  ) THEN
    v_role := 'admin';
  ELSE
    v_role := 'staff';
  END IF;
  
  -- Create user role with organisation
  INSERT INTO public.user_roles (user_id, organisation_id, role)
  VALUES (NEW.id, v_org_id, v_role);
  
  -- Increment invitation code usage
  IF v_invite_code IS NOT NULL THEN
    UPDATE public.invitation_codes
    SET used_count = used_count + 1, updated_at = now()
    WHERE code = v_invite_code;
  END IF;
  
  RETURN NEW;
END;
$function$;