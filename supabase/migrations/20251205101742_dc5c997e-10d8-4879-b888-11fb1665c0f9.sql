-- Create facilities table
CREATE TABLE public.facilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  organisation_id uuid REFERENCES public.organisations(id),
  name text NOT NULL,
  capacity numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;

-- Users can view facilities in their organisation
CREATE POLICY "Users can view facilities in their organisation"
ON public.facilities FOR SELECT
USING (organisation_id = get_user_organisation_id(auth.uid()));

-- Masters and admins can manage facilities in their organisation
CREATE POLICY "Masters and admins can manage facilities in their organisation"
ON public.facilities FOR ALL
USING ((organisation_id = get_user_organisation_id(auth.uid())) AND can_manage_roles(auth.uid()))
WITH CHECK (organisation_id = get_user_organisation_id(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_facilities_updated_at
BEFORE UPDATE ON public.facilities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();