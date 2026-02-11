
-- Add shift_period column to rota_oncalls
ALTER TABLE public.rota_oncalls
ADD COLUMN shift_period text NOT NULL DEFAULT 'am';

-- Drop existing unique constraint (it's used for upsert)
-- First find and drop it
DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.rota_oncalls'::regclass
  AND contype = 'u'
  AND array_length(conkey, 1) = 3;
  
  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.rota_oncalls DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

-- Duplicate existing records for PM period (existing ones are now 'am')
INSERT INTO public.rota_oncalls (organisation_id, oncall_date, oncall_slot, user_id, is_temp_staff, temp_confirmed, temp_staff_name, shift_period)
SELECT organisation_id, oncall_date, oncall_slot, user_id, is_temp_staff, temp_confirmed, temp_staff_name, 'pm'
FROM public.rota_oncalls
WHERE shift_period = 'am';

-- Add new unique constraint including shift_period
ALTER TABLE public.rota_oncalls
ADD CONSTRAINT rota_oncalls_org_date_slot_period_unique
UNIQUE (organisation_id, oncall_date, oncall_slot, shift_period);

-- Add check constraint for valid values
ALTER TABLE public.rota_oncalls
ADD CONSTRAINT rota_oncalls_shift_period_check
CHECK (shift_period IN ('am', 'pm'));
