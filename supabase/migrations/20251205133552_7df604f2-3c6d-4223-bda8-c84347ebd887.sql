-- Allow masters and admins to update profiles in their organisation
CREATE POLICY "Masters and admins can update profiles in their org"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  (organisation_id = get_user_organisation_id(auth.uid())) 
  AND can_manage_roles(auth.uid())
)
WITH CHECK (
  organisation_id = get_user_organisation_id(auth.uid())
);