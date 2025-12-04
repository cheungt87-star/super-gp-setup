-- Add site_manager_id to sites table
ALTER TABLE public.sites ADD COLUMN site_manager_id uuid REFERENCES profiles(id);

-- Create site_opening_hours table
CREATE TABLE public.site_opening_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid REFERENCES sites(id) ON DELETE CASCADE NOT NULL,
  organisation_id uuid REFERENCES organisations(id),
  day_of_week smallint NOT NULL,
  open_time time,
  close_time time,
  is_closed boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (site_id, day_of_week)
);

-- Add check constraint for day_of_week via trigger (to avoid CHECK constraint issues)
CREATE OR REPLACE FUNCTION public.validate_day_of_week()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.day_of_week < 0 OR NEW.day_of_week > 6 THEN
    RAISE EXCEPTION 'day_of_week must be between 0 (Monday) and 6 (Sunday)';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_day_of_week_trigger
BEFORE INSERT OR UPDATE ON public.site_opening_hours
FOR EACH ROW EXECUTE FUNCTION public.validate_day_of_week();

-- Enable RLS
ALTER TABLE public.site_opening_hours ENABLE ROW LEVEL SECURITY;

-- RLS policies for site_opening_hours
CREATE POLICY "Users can view opening hours in their organisation"
ON public.site_opening_hours
FOR SELECT
USING (organisation_id = get_user_organisation_id(auth.uid()));

CREATE POLICY "Masters and admins can manage opening hours in their organisation"
ON public.site_opening_hours
FOR ALL
USING ((organisation_id = get_user_organisation_id(auth.uid())) AND can_manage_roles(auth.uid()))
WITH CHECK (organisation_id = get_user_organisation_id(auth.uid()));

-- Add updated_at trigger for site_opening_hours
CREATE TRIGGER update_site_opening_hours_updated_at
BEFORE UPDATE ON public.site_opening_hours
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();