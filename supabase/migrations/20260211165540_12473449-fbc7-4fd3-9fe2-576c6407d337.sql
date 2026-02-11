-- Persist custom time ranges for on-call assignments
ALTER TABLE public.rota_oncalls
ADD COLUMN IF NOT EXISTS custom_start_time time;

ALTER TABLE public.rota_oncalls
ADD COLUMN IF NOT EXISTS custom_end_time time;
