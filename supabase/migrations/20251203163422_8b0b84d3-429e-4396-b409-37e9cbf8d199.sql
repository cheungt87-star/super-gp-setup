-- Create function to get organisation options (sites and job titles) bypassing RLS
-- This is used during registration when user is not yet authenticated
CREATE OR REPLACE FUNCTION public.get_organisation_options(p_organisation_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_sites json;
  v_job_titles json;
BEGIN
  -- Get active sites for the organisation
  SELECT COALESCE(json_agg(json_build_object('id', id, 'name', name) ORDER BY name), '[]'::json)
  INTO v_sites
  FROM sites
  WHERE organisation_id = p_organisation_id AND is_active = true;
  
  -- Get job titles for the organisation
  SELECT COALESCE(json_agg(json_build_object('id', id, 'name', name) ORDER BY name), '[]'::json)
  INTO v_job_titles
  FROM job_titles
  WHERE organisation_id = p_organisation_id;
  
  RETURN json_build_object(
    'sites', v_sites,
    'job_titles', v_job_titles
  );
END;
$$;