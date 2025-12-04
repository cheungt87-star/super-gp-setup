-- Add 'master' to app_role enum (before 'admin')
-- This must be committed before using the new value
ALTER TYPE app_role ADD VALUE 'master' BEFORE 'admin';