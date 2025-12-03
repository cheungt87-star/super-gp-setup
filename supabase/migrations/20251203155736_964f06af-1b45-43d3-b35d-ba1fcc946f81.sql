-- Create SECURITY DEFINER function for invitation code validation
CREATE OR REPLACE FUNCTION public.validate_invitation_code(p_code TEXT, p_email TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_invitation RECORD;
  v_org RECORD;
  v_profile_exists BOOLEAN;
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
  
  -- Return success with all data
  RETURN json_build_object(
    'valid', true,
    'code', v_invitation.code,
    'organisation_id', v_invitation.organisation_id,
    'organisation_name', v_org.name,
    'onboarding_complete', COALESCE(v_org.onboarding_complete, false),
    'is_email_linked', v_invitation.email IS NOT NULL,
    'profile_exists', v_profile_exists
  );
END;
$$;

-- Remove the RLS policy that was added for anonymous access (no longer needed)
DROP POLICY IF EXISTS "Anyone can view organisation via active invitation code" ON public.organisations;