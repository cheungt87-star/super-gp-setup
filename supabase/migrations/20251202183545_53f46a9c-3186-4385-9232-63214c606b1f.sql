-- 1. Add column to track which invite code created the organisation
ALTER TABLE public.organisations 
ADD COLUMN created_from_invite_code_id uuid REFERENCES public.invitation_codes(id);

-- 2. Make organisation_id nullable on invitation_codes (codes can exist before org is created)
ALTER TABLE public.invitation_codes 
ALTER COLUMN organisation_id DROP NOT NULL;

-- 3. Update the handle_new_user trigger to create organisation if needed
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_org_name text;
  v_invite_code text;
  v_invite_code_id uuid;
  v_role app_role;
BEGIN
  -- Get data from user metadata
  v_org_name := NEW.raw_user_meta_data ->> 'organisation_name';
  v_invite_code := NEW.raw_user_meta_data ->> 'invitation_code';

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

  -- Create profile with organisation
  INSERT INTO public.profiles (id, email, first_name, last_name, organisation_id)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    v_org_id
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

-- 4. Clean up all test data in correct order
DELETE FROM public.rooms WHERE organisation_id = '11111111-1111-1111-1111-111111111111';
DELETE FROM public.job_titles WHERE organisation_id = '11111111-1111-1111-1111-111111111111';
DELETE FROM public.sites WHERE organisation_id = '11111111-1111-1111-1111-111111111111';
DELETE FROM public.user_roles WHERE organisation_id = '11111111-1111-1111-1111-111111111111';
DELETE FROM public.profiles WHERE organisation_id = '11111111-1111-1111-1111-111111111111';
DELETE FROM public.organisations WHERE id = '11111111-1111-1111-1111-111111111111';
UPDATE public.invitation_codes SET organisation_id = NULL WHERE code = 'TESTGP2024';