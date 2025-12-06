-- Create rota_day_confirmations table to track which days have been reviewed
CREATE TABLE public.rota_day_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rota_week_id uuid NOT NULL REFERENCES rota_weeks(id) ON DELETE CASCADE,
  shift_date date NOT NULL,
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'confirmed_with_overrides')),
  confirmed_by uuid NOT NULL REFERENCES profiles(id),
  confirmed_at timestamptz NOT NULL DEFAULT now(),
  organisation_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(rota_week_id, shift_date)
);

-- Enable RLS
ALTER TABLE public.rota_day_confirmations ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view confirmations in their organisation"
ON public.rota_day_confirmations FOR SELECT
USING (organisation_id = get_user_organisation_id(auth.uid()));

CREATE POLICY "Masters and admins can manage confirmations"
ON public.rota_day_confirmations FOR ALL
USING ((organisation_id = get_user_organisation_id(auth.uid())) AND can_manage_roles(auth.uid()))
WITH CHECK (organisation_id = get_user_organisation_id(auth.uid()));

-- Add updated_at trigger
CREATE TRIGGER update_rota_day_confirmations_updated_at
BEFORE UPDATE ON public.rota_day_confirmations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Extend rota_rule_overrides with day-specific columns
ALTER TABLE public.rota_rule_overrides 
ADD COLUMN IF NOT EXISTS shift_date date,
ADD COLUMN IF NOT EXISTS facility_id uuid REFERENCES facilities(id);