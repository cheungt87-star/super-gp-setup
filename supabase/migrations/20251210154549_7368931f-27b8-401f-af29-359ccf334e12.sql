-- Create rota_oncalls table for organization-wide on-call assignments
CREATE TABLE public.rota_oncalls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL,
  oncall_date DATE NOT NULL,
  oncall_slot SMALLINT NOT NULL DEFAULT 1, -- 1, 2, 3 for the three on-call slots
  user_id UUID REFERENCES public.profiles(id),
  is_temp_staff BOOLEAN NOT NULL DEFAULT false,
  temp_staff_name TEXT,
  temp_confirmed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, oncall_date, oncall_slot)
);

-- Enable RLS
ALTER TABLE public.rota_oncalls ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view oncalls in their organisation" 
ON public.rota_oncalls 
FOR SELECT 
USING (organisation_id = get_user_organisation_id(auth.uid()));

CREATE POLICY "Masters and admins can manage oncalls" 
ON public.rota_oncalls 
FOR ALL 
USING (organisation_id = get_user_organisation_id(auth.uid()) AND can_manage_roles(auth.uid()))
WITH CHECK (organisation_id = get_user_organisation_id(auth.uid()));

-- Add updated_at trigger
CREATE TRIGGER update_rota_oncalls_updated_at
BEFORE UPDATE ON public.rota_oncalls
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate existing on-call data from rota_shifts to rota_oncalls
INSERT INTO public.rota_oncalls (organisation_id, oncall_date, oncall_slot, user_id, is_temp_staff, temp_staff_name, temp_confirmed)
SELECT DISTINCT ON (organisation_id, shift_date, oncall_slot)
  organisation_id,
  shift_date,
  COALESCE(oncall_slot, 1),
  user_id,
  is_temp_staff,
  temp_staff_name,
  temp_confirmed
FROM public.rota_shifts
WHERE is_oncall = true
ORDER BY organisation_id, shift_date, oncall_slot, created_at DESC;

-- Delete on-call shifts from rota_shifts (they're now in rota_oncalls)
DELETE FROM public.rota_shifts WHERE is_oncall = true;