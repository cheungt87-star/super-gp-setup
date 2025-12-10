-- Create secondary_roles table
CREATE TABLE public.secondary_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  organisation_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint for name within organisation
ALTER TABLE public.secondary_roles ADD CONSTRAINT secondary_roles_name_org_unique UNIQUE (name, organisation_id);

-- Enable RLS
ALTER TABLE public.secondary_roles ENABLE ROW LEVEL SECURITY;

-- RLS policies for secondary_roles
CREATE POLICY "Users can view secondary roles in their organisation"
ON public.secondary_roles
FOR SELECT
USING (organisation_id = get_user_organisation_id(auth.uid()));

CREATE POLICY "Masters and admins can manage secondary roles"
ON public.secondary_roles
FOR ALL
USING ((organisation_id = get_user_organisation_id(auth.uid())) AND can_manage_roles(auth.uid()))
WITH CHECK (organisation_id = get_user_organisation_id(auth.uid()));

-- Create user_secondary_roles junction table
CREATE TABLE public.user_secondary_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  secondary_role_id UUID NOT NULL REFERENCES public.secondary_roles(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint to prevent duplicate assignments
ALTER TABLE public.user_secondary_roles ADD CONSTRAINT user_secondary_roles_unique UNIQUE (user_id, secondary_role_id);

-- Enable RLS
ALTER TABLE public.user_secondary_roles ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_secondary_roles
CREATE POLICY "Users can view secondary role assignments in their organisation"
ON public.user_secondary_roles
FOR SELECT
USING (organisation_id = get_user_organisation_id(auth.uid()));

CREATE POLICY "Masters and admins can manage secondary role assignments"
ON public.user_secondary_roles
FOR ALL
USING ((organisation_id = get_user_organisation_id(auth.uid())) AND can_manage_roles(auth.uid()))
WITH CHECK (organisation_id = get_user_organisation_id(auth.uid()));

-- Add trigger for updated_at on secondary_roles
CREATE TRIGGER update_secondary_roles_updated_at
BEFORE UPDATE ON public.secondary_roles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();