ALTER TABLE public.sites
ADD COLUMN am_capacity_per_room integer NOT NULL DEFAULT 0,
ADD COLUMN pm_capacity_per_room integer NOT NULL DEFAULT 0;