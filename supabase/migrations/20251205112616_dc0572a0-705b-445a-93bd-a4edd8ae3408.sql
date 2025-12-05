-- Create task_completions table to track completed workflow tasks
CREATE TABLE public.task_completions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_task_id uuid NOT NULL REFERENCES public.workflow_tasks(id) ON DELETE CASCADE,
  completed_by uuid NOT NULL,
  completed_at timestamp with time zone NOT NULL DEFAULT now(),
  due_date date NOT NULL,
  comments text,
  declaration_confirmed boolean NOT NULL DEFAULT false,
  organisation_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.task_completions ENABLE ROW LEVEL SECURITY;

-- Users can view completions in their organisation
CREATE POLICY "Users can view completions in their organisation"
ON public.task_completions
FOR SELECT
USING (organisation_id = get_user_organisation_id(auth.uid()));

-- Users can insert completions for tasks in their organisation
CREATE POLICY "Users can insert completions in their organisation"
ON public.task_completions
FOR INSERT
WITH CHECK (
  organisation_id = get_user_organisation_id(auth.uid())
  AND completed_by = auth.uid()
);

-- Create index for efficient queries
CREATE INDEX idx_task_completions_workflow_task_id ON public.task_completions(workflow_task_id);
CREATE INDEX idx_task_completions_due_date ON public.task_completions(due_date);
CREATE INDEX idx_task_completions_completed_by ON public.task_completions(completed_by);