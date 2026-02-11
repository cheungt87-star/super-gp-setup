
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_org_id uuid;
  v_org_name text;
  v_invite_code text;
  v_invite_code_id uuid;
  v_role app_role;
  v_primary_site_id uuid;
  v_job_title_id uuid;
  v_existing_profile_id uuid;
BEGIN
  -- Get data from user metadata
  v_org_name := NEW.raw_user_meta_data ->> 'organisation_name';
  v_invite_code := NEW.raw_user_meta_data ->> 'invitation_code';
  v_primary_site_id := NULLIF(NEW.raw_user_meta_data ->> 'primary_site_id', '')::uuid;
  v_job_title_id := NULLIF(NEW.raw_user_meta_data ->> 'job_title_id', '')::uuid;

  -- Get the invitation code record
  SELECT id, organisation_id INTO v_invite_code_id, v_org_id
  FROM public.invitation_codes
  WHERE code = v_invite_code;

  -- If the invitation code doesn't have an org yet, create one
  IF v_org_id IS NULL AND v_org_name IS NOT NULL THEN
    INSERT INTO public.organisations (name, created_from_invite_code_id)
    VALUES (v_org_name, v_invite_code_id)
    RETURNING id INTO v_org_id;
    
    UPDATE public.invitation_codes
    SET organisation_id = v_org_id, updated_at = now()
    WHERE id = v_invite_code_id;
  END IF;

  -- Check if this is a CSV-enrolled user
  SELECT id INTO v_existing_profile_id
  FROM public.profiles
  WHERE lower(email) = lower(NEW.email)
    AND organisation_id = v_org_id;

  IF v_existing_profile_id IS NOT NULL THEN
    -- Update all FK references from the old profile ID to the new auth user ID
    UPDATE public.rota_shifts SET user_id = NEW.id WHERE user_id = v_existing_profile_id;
    UPDATE public.rota_oncalls SET user_id = NEW.id WHERE user_id = v_existing_profile_id;
    UPDATE public.rota_weeks SET created_by = NEW.id WHERE created_by = v_existing_profile_id;
    UPDATE public.rota_day_confirmations SET confirmed_by = NEW.id WHERE confirmed_by = v_existing_profile_id;
    UPDATE public.rota_rule_overrides SET overridden_by = NEW.id WHERE overridden_by = v_existing_profile_id;
    UPDATE public.invitation_codes SET created_by = NEW.id WHERE created_by = v_existing_profile_id;
    UPDATE public.sites SET site_manager_id = NEW.id WHERE site_manager_id = v_existing_profile_id;
    UPDATE public.workflow_tasks SET assignee_id = NEW.id WHERE assignee_id = v_existing_profile_id;
    UPDATE public.workflow_tasks SET created_by = NEW.id WHERE created_by = v_existing_profile_id;
    UPDATE public.task_completions SET completed_by = NEW.id WHERE completed_by = v_existing_profile_id;

    -- Now safely update the profile ID
    UPDATE public.profiles
    SET id = NEW.id,
        first_name = COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'first_name', ''), first_name),
        last_name = COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'last_name', ''), last_name),
        phone = COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'phone', ''), phone),
        primary_site_id = COALESCE(v_primary_site_id, primary_site_id),
        job_title_id = COALESCE(v_job_title_id, job_title_id),
        updated_at = now()
    WHERE id = v_existing_profile_id;
  ELSE
    INSERT INTO public.profiles (id, email, first_name, last_name, phone, organisation_id, primary_site_id, job_title_id)
    VALUES (
      NEW.id,
      NEW.email,
      NEW.raw_user_meta_data ->> 'first_name',
      NEW.raw_user_meta_data ->> 'last_name',
      NEW.raw_user_meta_data ->> 'phone',
      v_org_id,
      v_primary_site_id,
      v_job_title_id
    );
  END IF;
  
  -- First user in org = master, otherwise staff
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE organisation_id = v_org_id
  ) THEN
    v_role := 'master';
  ELSE
    v_role := 'staff';
  END IF;
  
  INSERT INTO public.user_roles (user_id, organisation_id, role)
  VALUES (NEW.id, v_org_id, v_role);
  
  IF v_invite_code IS NOT NULL THEN
    UPDATE public.invitation_codes
    SET used_count = used_count + 1, updated_at = now()
    WHERE code = v_invite_code;
  END IF;
  
  RETURN NEW;
END;
$function$;
