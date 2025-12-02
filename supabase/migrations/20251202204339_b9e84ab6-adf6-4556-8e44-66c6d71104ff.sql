-- Clean up orphaned job titles with NULL organisation_id
DELETE FROM public.job_titles WHERE organisation_id IS NULL;

-- Drop the old global unique constraint on name only
ALTER TABLE public.job_titles DROP CONSTRAINT IF EXISTS job_titles_name_key;

-- Create a new composite unique constraint (org-scoped)
ALTER TABLE public.job_titles ADD CONSTRAINT job_titles_name_organisation_unique 
  UNIQUE (name, organisation_id);