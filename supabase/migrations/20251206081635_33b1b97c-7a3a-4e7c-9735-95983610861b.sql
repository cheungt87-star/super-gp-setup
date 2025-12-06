-- Add facility_type column to facilities table
ALTER TABLE public.facilities 
ADD COLUMN facility_type text NOT NULL DEFAULT 'general_facility';

-- Add a check constraint to ensure valid values
ALTER TABLE public.facilities 
ADD CONSTRAINT facilities_type_check 
CHECK (facility_type IN ('clinic_room', 'general_facility'));