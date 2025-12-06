-- Add temp staff tracking columns to rota_shifts
ALTER TABLE public.rota_shifts 
ADD COLUMN is_temp_staff BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN temp_confirmed BOOLEAN NOT NULL DEFAULT false;