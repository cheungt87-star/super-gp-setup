-- Allow anyone to view organisation details if there's an active invitation code linking to it
CREATE POLICY "Anyone can view organisation via active invitation code"
ON public.organisations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.invitation_codes
    WHERE invitation_codes.organisation_id = organisations.id
    AND invitation_codes.is_active = true
  )
);