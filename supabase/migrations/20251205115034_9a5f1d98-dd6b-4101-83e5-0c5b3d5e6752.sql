-- Drop the existing foreign key constraint referencing auth.users
ALTER TABLE workflow_tasks 
DROP CONSTRAINT IF EXISTS workflow_tasks_created_by_fkey;

-- Add new foreign key referencing profiles instead (profiles.id = auth.users.id)
ALTER TABLE workflow_tasks 
ADD CONSTRAINT workflow_tasks_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES profiles(id);