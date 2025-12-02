-- Create function to check if a profile exists by email (bypasses RLS)
CREATE OR REPLACE FUNCTION public.check_profile_exists_by_email(check_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE lower(email) = lower(check_email)
  )
$$;