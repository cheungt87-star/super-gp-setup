-- Create recurrence pattern enum
CREATE TYPE public.recurrence_pattern AS ENUM ('daily', 'weekly', 'monthly', 'custom');

-- Create workflow tasks table
CREATE TABLE public.workflow_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE NOT NULL,
  facility_id UUID REFERENCES public.facilities(id) ON DELETE SET NULL,
  initial_due_date DATE NOT NULL,
  recurrence_pattern recurrence_pattern NOT NULL DEFAULT 'daily',
  recurrence_interval_days INTEGER,
  assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workflow_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view workflow tasks in their organisation"
  ON public.workflow_tasks FOR SELECT
  USING (organisation_id = get_user_organisation_id(auth.uid()));

CREATE POLICY "Masters and admins can manage workflow tasks"
  ON public.workflow_tasks FOR ALL
  USING (organisation_id = get_user_organisation_id(auth.uid()) AND can_manage_roles(auth.uid()))
  WITH CHECK (organisation_id = get_user_organisation_id(auth.uid()));

-- Updated at trigger
CREATE TRIGGER update_workflow_tasks_updated_at
  BEFORE UPDATE ON public.workflow_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_workflow_tasks_org ON public.workflow_tasks(organisation_id);
CREATE INDEX idx_workflow_tasks_site ON public.workflow_tasks(site_id);