-- Insert staff role for profiles that have corresponding auth accounts but no role
INSERT INTO user_roles (user_id, organisation_id, role)
SELECT p.id, p.organisation_id, 'staff'::app_role
FROM profiles p
INNER JOIN auth.users au ON p.id = au.id
LEFT JOIN user_roles ur ON p.id = ur.user_id
WHERE ur.id IS NULL
  AND p.organisation_id IS NOT NULL;