-- Add structured address columns to sites table
ALTER TABLE public.sites 
ADD COLUMN address_line_1 text,
ADD COLUMN address_line_2 text,
ADD COLUMN city text,
ADD COLUMN county text,
ADD COLUMN postcode text;

-- Migrate existing address data to address_line_1 if any exists
UPDATE public.sites 
SET address_line_1 = address 
WHERE address IS NOT NULL AND address != '';

-- Keep the old address column for now (backward compatibility)