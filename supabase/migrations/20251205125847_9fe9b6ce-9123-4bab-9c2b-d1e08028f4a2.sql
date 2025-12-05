-- Create enums for rota management
CREATE TYPE rota_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE shift_type AS ENUM ('full_day', 'am', 'pm', 'custom');

-- Create rota_rules table (site-level shift timing and settings)
CREATE TABLE public.rota_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  am_shift_start TIME NOT NULL DEFAULT '09:00',
  am_shift_end TIME NOT NULL DEFAULT '13:00',
  pm_shift_start TIME NOT NULL DEFAULT '13:00',
  pm_shift_end TIME NOT NULL DEFAULT '18:00',
  require_oncall BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(site_id)
);

-- Create rota_staffing_rules table (min/max staff per job title)
CREATE TABLE public.rota_staffing_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rota_rule_id UUID NOT NULL REFERENCES public.rota_rules(id) ON DELETE CASCADE,
  job_title_id UUID NOT NULL REFERENCES public.job_titles(id) ON DELETE CASCADE,
  min_staff INTEGER NOT NULL DEFAULT 0,
  max_staff INTEGER,
  organisation_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(rota_rule_id, job_title_id)
);

-- Create rota_weeks table (weekly rota containers)
CREATE TABLE public.rota_weeks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  status rota_status NOT NULL DEFAULT 'draft',
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(site_id, week_start)
);

-- Create rota_shifts table (individual shift assignments)
CREATE TABLE public.rota_shifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rota_week_id UUID NOT NULL REFERENCES public.rota_weeks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  shift_date DATE NOT NULL,
  shift_type shift_type NOT NULL DEFAULT 'full_day',
  custom_start_time TIME,
  custom_end_time TIME,
  is_oncall BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  organisation_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create rota_rule_overrides table (track warning overrides)
CREATE TABLE public.rota_rule_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rota_week_id UUID NOT NULL REFERENCES public.rota_weeks(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL,
  rule_description TEXT NOT NULL,
  overridden_by UUID NOT NULL REFERENCES public.profiles(id),
  reason TEXT NOT NULL,
  organisation_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.rota_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rota_staffing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rota_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rota_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rota_rule_overrides ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rota_rules
CREATE POLICY "Users can view rota rules in their organisation"
ON public.rota_rules FOR SELECT
USING (organisation_id = get_user_organisation_id(auth.uid()));

CREATE POLICY "Masters and admins can manage rota rules"
ON public.rota_rules FOR ALL
USING (organisation_id = get_user_organisation_id(auth.uid()) AND can_manage_roles(auth.uid()))
WITH CHECK (organisation_id = get_user_organisation_id(auth.uid()));

-- RLS Policies for rota_staffing_rules
CREATE POLICY "Users can view staffing rules in their organisation"
ON public.rota_staffing_rules FOR SELECT
USING (organisation_id = get_user_organisation_id(auth.uid()));

CREATE POLICY "Masters and admins can manage staffing rules"
ON public.rota_staffing_rules FOR ALL
USING (organisation_id = get_user_organisation_id(auth.uid()) AND can_manage_roles(auth.uid()))
WITH CHECK (organisation_id = get_user_organisation_id(auth.uid()));

-- RLS Policies for rota_weeks
CREATE POLICY "Users can view rota weeks in their organisation"
ON public.rota_weeks FOR SELECT
USING (organisation_id = get_user_organisation_id(auth.uid()));

CREATE POLICY "Masters and admins can manage rota weeks"
ON public.rota_weeks FOR ALL
USING (organisation_id = get_user_organisation_id(auth.uid()) AND can_manage_roles(auth.uid()))
WITH CHECK (organisation_id = get_user_organisation_id(auth.uid()));

-- RLS Policies for rota_shifts
CREATE POLICY "Users can view shifts in their organisation"
ON public.rota_shifts FOR SELECT
USING (organisation_id = get_user_organisation_id(auth.uid()));

CREATE POLICY "Users can view their own shifts"
ON public.rota_shifts FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Masters and admins can manage shifts"
ON public.rota_shifts FOR ALL
USING (organisation_id = get_user_organisation_id(auth.uid()) AND can_manage_roles(auth.uid()))
WITH CHECK (organisation_id = get_user_organisation_id(auth.uid()));

-- RLS Policies for rota_rule_overrides
CREATE POLICY "Users can view overrides in their organisation"
ON public.rota_rule_overrides FOR SELECT
USING (organisation_id = get_user_organisation_id(auth.uid()));

CREATE POLICY "Masters and admins can manage overrides"
ON public.rota_rule_overrides FOR ALL
USING (organisation_id = get_user_organisation_id(auth.uid()) AND can_manage_roles(auth.uid()))
WITH CHECK (organisation_id = get_user_organisation_id(auth.uid()));

-- Create triggers for updated_at
CREATE TRIGGER update_rota_rules_updated_at
BEFORE UPDATE ON public.rota_rules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rota_weeks_updated_at
BEFORE UPDATE ON public.rota_weeks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rota_shifts_updated_at
BEFORE UPDATE ON public.rota_shifts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();