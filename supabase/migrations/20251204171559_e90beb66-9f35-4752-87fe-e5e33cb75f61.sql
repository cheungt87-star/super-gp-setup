-- Create is_master() function
CREATE OR REPLACE FUNCTION public.is_master(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'master'
  )
$$;

-- Create can_manage_roles() function (master or admin)
CREATE OR REPLACE FUNCTION public.can_manage_roles(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('master', 'admin')
  )
$$;

-- Update get_user_role() to include master priority
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role 
      WHEN 'master' THEN 0
      WHEN 'admin' THEN 1 
      WHEN 'manager' THEN 2 
      WHEN 'staff' THEN 3 
    END
  LIMIT 1
$$;

-- Update handle_new_user() trigger to assign master to first user
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
    INSERT INTO public.organisations (name, created_from_invite_code_id)
    VALUES (v_org_name, v_invite_code_id)
    RETURNING id INTO v_org_id;
    
    UPDATE public.invitation_codes
    SET organisation_id = v_org_id, updated_at = now()
    WHERE id = v_invite_code_id;
  END IF;

  -- Check if this is a CSV-enrolled user
  SELECT id INTO v_existing_profile_id
  FROM public.profiles
  WHERE lower(email) = lower(NEW.email)
    AND organisation_id = v_org_id;

  IF v_existing_profile_id IS NOT NULL THEN
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
  
  -- First user in org = master, otherwise staff
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE organisation_id = v_org_id
  ) THEN
    v_role := 'master';
  ELSE
    v_role := 'staff';
  END IF;
  
  INSERT INTO public.user_roles (user_id, organisation_id, role)
  VALUES (NEW.id, v_org_id, v_role);
  
  IF v_invite_code IS NOT NULL THEN
    UPDATE public.invitation_codes
    SET used_count = used_count + 1, updated_at = now()
    WHERE code = v_invite_code;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update RLS policies to use can_manage_roles

-- Sites table
DROP POLICY IF EXISTS "Admins can manage sites in their organisation" ON sites;
CREATE POLICY "Masters and admins can manage sites in their organisation" ON sites
FOR ALL
USING (organisation_id = get_user_organisation_id(auth.uid()) AND can_manage_roles(auth.uid()))
WITH CHECK (organisation_id = get_user_organisation_id(auth.uid()));

-- Job titles table
DROP POLICY IF EXISTS "Admins can manage job titles in their organisation" ON job_titles;
CREATE POLICY "Masters and admins can manage job titles in their organisation" ON job_titles
FOR ALL
USING (organisation_id = get_user_organisation_id(auth.uid()) AND can_manage_roles(auth.uid()))
WITH CHECK (organisation_id = get_user_organisation_id(auth.uid()));

-- Rooms table
DROP POLICY IF EXISTS "Admins can manage rooms in their organisation" ON rooms;
CREATE POLICY "Masters and admins can manage rooms in their organisation" ON rooms
FOR ALL
USING (organisation_id = get_user_organisation_id(auth.uid()) AND can_manage_roles(auth.uid()))
WITH CHECK (organisation_id = get_user_organisation_id(auth.uid()));

-- Profiles table
DROP POLICY IF EXISTS "Admins can insert profiles in their org" ON profiles;
CREATE POLICY "Masters and admins can insert profiles in their org" ON profiles
FOR INSERT
WITH CHECK (organisation_id = get_user_organisation_id(auth.uid()) AND can_manage_roles(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete profiles in their org" ON profiles;
CREATE POLICY "Masters and admins can delete profiles in their org" ON profiles
FOR DELETE
USING (organisation_id = get_user_organisation_id(auth.uid()) AND can_manage_roles(auth.uid()) AND id <> auth.uid());

-- User roles table
DROP POLICY IF EXISTS "Admins can manage roles in their organisation" ON user_roles;
CREATE POLICY "Masters and admins can manage roles in their organisation" ON user_roles
FOR ALL
USING (organisation_id = get_user_organisation_id(auth.uid()) AND can_manage_roles(auth.uid()))
WITH CHECK (organisation_id = get_user_organisation_id(auth.uid()));

DROP POLICY IF EXISTS "Admins can view all roles in their organisation" ON user_roles;
CREATE POLICY "Masters and admins can view all roles in their organisation" ON user_roles
FOR SELECT
USING (organisation_id = get_user_organisation_id(auth.uid()) AND can_manage_roles(auth.uid()));

-- Invitation codes table
DROP POLICY IF EXISTS "Admins can manage invitation codes in their org" ON invitation_codes;
CREATE POLICY "Masters and admins can manage invitation codes in their org" ON invitation_codes
FOR ALL
USING (organisation_id = get_user_organisation_id(auth.uid()) AND can_manage_roles(auth.uid()))
WITH CHECK (organisation_id = get_user_organisation_id(auth.uid()));

-- Organisations table
DROP POLICY IF EXISTS "Admins can update their organisation" ON organisations;
CREATE POLICY "Masters and admins can update their organisation" ON organisations
FOR UPDATE
USING (id = get_user_organisation_id(auth.uid()) AND can_manage_roles(auth.uid()));