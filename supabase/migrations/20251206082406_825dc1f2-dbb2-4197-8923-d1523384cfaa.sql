-- Rename existing columns to AM
ALTER TABLE public.site_opening_hours 
  RENAME COLUMN open_time TO am_open_time;

ALTER TABLE public.site_opening_hours 
  RENAME COLUMN close_time TO am_close_time;

-- Add PM columns
ALTER TABLE public.site_opening_hours 
  ADD COLUMN pm_open_time time without time zone;

ALTER TABLE public.site_opening_hours 
  ADD COLUMN pm_close_time time without time zone;

-- Set default PM values for existing rows
UPDATE public.site_opening_hours 
SET pm_open_time = '14:00:00'::time, 
    pm_close_time = '17:00:00'::time
WHERE is_closed = false;