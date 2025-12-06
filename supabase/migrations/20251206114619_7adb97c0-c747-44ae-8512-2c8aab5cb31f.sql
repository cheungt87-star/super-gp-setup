-- Add temp staff name column for external agency staff
ALTER TABLE rota_shifts ADD COLUMN temp_staff_name text;

-- Make user_id nullable to support external temp staff
ALTER TABLE rota_shifts ALTER COLUMN user_id DROP NOT NULL;

-- Create validation function to ensure data integrity
CREATE OR REPLACE FUNCTION validate_rota_shift_user()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- If not temp staff, user_id is required
  IF NEW.is_temp_staff = false AND NEW.user_id IS NULL THEN
    RAISE EXCEPTION 'user_id is required for non-temp staff shifts';
  END IF;
  
  -- If temp staff with no user_id, temp_staff_name is required
  IF NEW.is_temp_staff = true AND NEW.user_id IS NULL AND (NEW.temp_staff_name IS NULL OR NEW.temp_staff_name = '') THEN
    RAISE EXCEPTION 'temp_staff_name is required for external temp staff shifts';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for validation
CREATE TRIGGER validate_shift_user_trigger
BEFORE INSERT OR UPDATE ON rota_shifts
FOR EACH ROW EXECUTE FUNCTION validate_rota_shift_user();