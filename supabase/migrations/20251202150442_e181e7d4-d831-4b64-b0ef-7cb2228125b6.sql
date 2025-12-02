-- Phase 1: Create organisations table
CREATE TABLE public.organisations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY;

-- Phase 2: Create invitation_codes table
CREATE TABLE public.invitation_codes (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code             text UNIQUE NOT NULL,
  organisation_id  uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  max_uses         int NOT NULL DEFAULT 1,
  used_count       int NOT NULL DEFAULT 0,
  expires_at       timestamptz,
  is_active        boolean NOT NULL DEFAULT true,
  created_by       uuid REFERENCES public.profiles(id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.invitation_codes ENABLE ROW LEVEL SECURITY;

-- Phase 3: Add organisation_id to existing tables (nullable first)
ALTER TABLE public.profiles ADD COLUMN organisation_id uuid REFERENCES public.organisations(id);
ALTER TABLE public.sites ADD COLUMN organisation_id uuid REFERENCES public.organisations(id);
ALTER TABLE public.job_titles ADD COLUMN organisation_id uuid REFERENCES public.organisations(id);
ALTER TABLE public.rooms ADD COLUMN organisation_id uuid REFERENCES public.organisations(id);
ALTER TABLE public.user_roles ADD COLUMN organisation_id uuid REFERENCES public.organisations(id);

-- Phase 4: Create helper function to get user's organisation
CREATE OR REPLACE FUNCTION public.get_user_organisation_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organisation_id
  FROM public.profiles
  WHERE id = _user_id
$$;

-- Phase 5: Drop existing RLS policies
DROP POLICY IF EXISTS "Admins can manage job titles" ON public.job_titles;
DROP POLICY IF EXISTS "Authenticated users can view job titles" ON public.job_titles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage rooms" ON public.rooms;
DROP POLICY IF EXISTS "Authenticated users can view rooms" ON public.rooms;
DROP POLICY IF EXISTS "Admins can manage sites" ON public.sites;
DROP POLICY IF EXISTS "Authenticated users can view sites" ON public.sites;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;

-- Phase 6: Create org-scoped RLS policies

-- ORGANISATIONS policies
CREATE POLICY "Users can view their own organisation"
ON public.organisations FOR SELECT
USING (id = public.get_user_organisation_id(auth.uid()));

CREATE POLICY "Admins can update their organisation"
ON public.organisations FOR UPDATE
USING (
  id = public.get_user_organisation_id(auth.uid())
  AND public.has_role(auth.uid(), 'admin')
);

-- PROFILES policies
CREATE POLICY "Users can view profiles in their organisation"
ON public.profiles FOR SELECT
USING (organisation_id = public.get_user_organisation_id(auth.uid()));

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (id = auth.uid());

CREATE POLICY "Admins can insert profiles in their org"
ON public.profiles FOR INSERT
WITH CHECK (
  organisation_id = public.get_user_organisation_id(auth.uid())
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can delete profiles in their org"
ON public.profiles FOR DELETE
USING (
  organisation_id = public.get_user_organisation_id(auth.uid())
  AND public.has_role(auth.uid(), 'admin')
  AND id != auth.uid()
);

-- SITES policies
CREATE POLICY "Users can view sites in their organisation"
ON public.sites FOR SELECT
USING (organisation_id = public.get_user_organisation_id(auth.uid()));

CREATE POLICY "Admins can manage sites in their organisation"
ON public.sites FOR ALL
USING (
  organisation_id = public.get_user_organisation_id(auth.uid())
  AND public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  organisation_id = public.get_user_organisation_id(auth.uid())
);

-- JOB_TITLES policies
CREATE POLICY "Users can view job titles in their organisation"
ON public.job_titles FOR SELECT
USING (organisation_id = public.get_user_organisation_id(auth.uid()));

CREATE POLICY "Admins can manage job titles in their organisation"
ON public.job_titles FOR ALL
USING (
  organisation_id = public.get_user_organisation_id(auth.uid())
  AND public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  organisation_id = public.get_user_organisation_id(auth.uid())
);

-- ROOMS policies
CREATE POLICY "Users can view rooms in their organisation"
ON public.rooms FOR SELECT
USING (organisation_id = public.get_user_organisation_id(auth.uid()));

CREATE POLICY "Admins can manage rooms in their organisation"
ON public.rooms FOR ALL
USING (
  organisation_id = public.get_user_organisation_id(auth.uid())
  AND public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  organisation_id = public.get_user_organisation_id(auth.uid())
);

-- USER_ROLES policies
CREATE POLICY "Users can view their own role"
ON public.user_roles FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all roles in their organisation"
ON public.user_roles FOR SELECT
USING (
  organisation_id = public.get_user_organisation_id(auth.uid())
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can manage roles in their organisation"
ON public.user_roles FOR ALL
USING (
  organisation_id = public.get_user_organisation_id(auth.uid())
  AND public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  organisation_id = public.get_user_organisation_id(auth.uid())
);

-- INVITATION_CODES policies
-- Allow anyone to validate codes (needed for registration)
CREATE POLICY "Anyone can validate invitation codes"
ON public.invitation_codes FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage invitation codes in their org"
ON public.invitation_codes FOR ALL
USING (
  organisation_id = public.get_user_organisation_id(auth.uid())
  AND public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  organisation_id = public.get_user_organisation_id(auth.uid())
);

-- Phase 7: Update handle_new_user() trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_invite_code text;
  v_role app_role;
BEGIN
  -- Get org and invite code from user metadata
  v_org_id := (NEW.raw_user_meta_data ->> 'organisation_id')::uuid;
  v_invite_code := NEW.raw_user_meta_data ->> 'invitation_code';

  -- Create profile with organisation
  INSERT INTO public.profiles (id, email, first_name, last_name, organisation_id)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    v_org_id
  );
  
  -- Determine role: first user in org = admin, otherwise staff
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
  
  -- Increment invitation code usage if provided
  IF v_invite_code IS NOT NULL THEN
    UPDATE public.invitation_codes
    SET used_count = used_count + 1, updated_at = now()
    WHERE code = v_invite_code;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Phase 8: Add updated_at triggers for new tables
CREATE TRIGGER update_organisations_updated_at
BEFORE UPDATE ON public.organisations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invitation_codes_updated_at
BEFORE UPDATE ON public.invitation_codes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();