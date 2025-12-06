-- Add facility_id column to rota_shifts table to support clinic room-based scheduling
ALTER TABLE public.rota_shifts ADD COLUMN facility_id uuid REFERENCES public.facilities(id);

-- Create index for performance when querying shifts by facility
CREATE INDEX idx_rota_shifts_facility_id ON public.rota_shifts(facility_id);