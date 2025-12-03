-- Update handle_new_user() to include primary_site_id and job_title_id from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_org_id uuid;
  v_org_name text;
  v_invite_code text;
  v_invite_code_id uuid;
  v_role app_role;
  v_primary_site_id uuid;
  v_job_title_id uuid;
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

  -- Create profile with organisation, phone, site, and job title
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
$$;