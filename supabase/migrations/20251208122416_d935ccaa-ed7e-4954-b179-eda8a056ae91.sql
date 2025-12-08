-- Create job_families table
CREATE TABLE public.job_families (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  organisation_id uuid REFERENCES public.organisations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(name, organisation_id)
);

-- Enable RLS
ALTER TABLE public.job_families ENABLE ROW LEVEL SECURITY;

-- RLS policies (matching job_titles pattern)
CREATE POLICY "Users can view job families in their organisation" 
  ON public.job_families FOR SELECT 
  USING (organisation_id = get_user_organisation_id(auth.uid()));

CREATE POLICY "Masters and admins can manage job families" 
  ON public.job_families FOR ALL 
  USING ((organisation_id = get_user_organisation_id(auth.uid())) AND can_manage_roles(auth.uid()))
  WITH CHECK (organisation_id = get_user_organisation_id(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_job_families_updated_at
  BEFORE UPDATE ON public.job_families
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add job_family_id to job_titles table
ALTER TABLE public.job_titles 
ADD COLUMN job_family_id uuid REFERENCES public.job_families(id) ON DELETE SET NULL;