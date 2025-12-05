-- Add created_by column to workflow_tasks to track who assigned each task
ALTER TABLE workflow_tasks 
ADD COLUMN created_by uuid REFERENCES auth.users(id);

-- Add index for better query performance
CREATE INDEX idx_workflow_tasks_created_by ON workflow_tasks(created_by);