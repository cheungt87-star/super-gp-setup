
DROP FUNCTION IF EXISTS public.get_organisation_users(uuid);

CREATE OR REPLACE FUNCTION public.get_organisation_users(p_organisation_id uuid)
RETURNS TABLE(id uuid, email text, first_name text, last_name text, phone text, phone_ext text, job_title_id uuid, job_title_name text, primary_site_id uuid, site_name text, role text, is_active boolean, registration_completed boolean, contracted_hours numeric, working_days jsonb, secondary_roles jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.first_name,
    p.last_name,
    p.phone,
    p.phone_ext,
    p.job_title_id,
    jt.name as job_title_name,
    p.primary_site_id,
    s.name as site_name,
    ur.role::text,
    p.is_active,
    (ur.id IS NOT NULL) as registration_completed,
    p.contracted_hours,
    p.working_days,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('id', sr.id, 'name', sr.name))
       FROM user_secondary_roles usr
       JOIN secondary_roles sr ON sr.id = usr.secondary_role_id
       WHERE usr.user_id = p.id),
      '[]'::jsonb
    ) as secondary_roles
  FROM profiles p
  LEFT JOIN job_titles jt ON p.job_title_id = jt.id
  LEFT JOIN sites s ON p.primary_site_id = s.id
  LEFT JOIN user_roles ur ON p.id = ur.user_id
  WHERE p.organisation_id = p_organisation_id
  ORDER BY p.first_name, p.last_name;
END;
$function$;
