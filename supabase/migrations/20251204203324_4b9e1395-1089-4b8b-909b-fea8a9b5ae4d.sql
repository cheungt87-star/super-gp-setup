ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS working_days jsonb 
DEFAULT '{"mon": false, "tue": false, "wed": false, "thu": false, "fri": false, "sat": false, "sun": false}';