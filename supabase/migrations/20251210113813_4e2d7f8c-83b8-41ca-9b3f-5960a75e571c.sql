-- Add oncall_slot column to support multiple on-call slots (1, 2, 3)
ALTER TABLE public.rota_shifts 
ADD COLUMN oncall_slot smallint DEFAULT NULL;

-- Add check constraint to ensure valid slot values
ALTER TABLE public.rota_shifts 
ADD CONSTRAINT valid_oncall_slot CHECK (oncall_slot IS NULL OR (oncall_slot >= 1 AND oncall_slot <= 3));

-- Update existing on-call shifts to use slot 1
UPDATE public.rota_shifts 
SET oncall_slot = 1 
WHERE is_oncall = true AND oncall_slot IS NULL;