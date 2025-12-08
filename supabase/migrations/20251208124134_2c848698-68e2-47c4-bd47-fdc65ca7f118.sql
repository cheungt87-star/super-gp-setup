-- Add job_family_id column to workflow_tasks for job family assignment
ALTER TABLE public.workflow_tasks 
ADD COLUMN job_family_id uuid REFERENCES public.job_families(id) ON DELETE SET NULL;

-- Add comment explaining the assignment logic (assignee_id OR job_family_id, mutually exclusive)
COMMENT ON COLUMN public.workflow_tasks.job_family_id IS 
  'If set, task is assigned to all users whose job title belongs to this job family. Mutually exclusive with assignee_id.';