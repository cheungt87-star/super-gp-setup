export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      facilities: {
        Row: {
          capacity: number
          created_at: string
          facility_type: string
          id: string
          is_active: boolean
          name: string
          organisation_id: string | null
          site_id: string
          updated_at: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          facility_type?: string
          id?: string
          is_active?: boolean
          name: string
          organisation_id?: string | null
          site_id: string
          updated_at?: string
        }
        Update: {
          capacity?: number
          created_at?: string
          facility_type?: string
          id?: string
          is_active?: boolean
          name?: string
          organisation_id?: string | null
          site_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "facilities_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facilities_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      invitation_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          email: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number
          organisation_id: string | null
          updated_at: string
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number
          organisation_id?: string | null
          updated_at?: string
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number
          organisation_id?: string | null
          updated_at?: string
          used_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "invitation_codes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitation_codes_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      job_families: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          organisation_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          organisation_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          organisation_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_families_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      job_titles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          job_family_id: string | null
          name: string
          organisation_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          job_family_id?: string | null
          name: string
          organisation_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          job_family_id?: string | null
          name?: string
          organisation_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_titles_job_family_id_fkey"
            columns: ["job_family_id"]
            isOneToOne: false
            referencedRelation: "job_families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_titles_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      organisations: {
        Row: {
          created_at: string
          created_from_invite_code_id: string | null
          id: string
          name: string
          onboarding_complete: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_from_invite_code_id?: string | null
          id?: string
          name: string
          onboarding_complete?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_from_invite_code_id?: string | null
          id?: string
          name?: string
          onboarding_complete?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organisations_created_from_invite_code_id_fkey"
            columns: ["created_from_invite_code_id"]
            isOneToOne: false
            referencedRelation: "invitation_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          contracted_hours: number | null
          created_at: string
          email: string
          first_name: string | null
          id: string
          is_active: boolean
          job_title_id: string | null
          last_name: string | null
          organisation_id: string | null
          phone: string | null
          phone_ext: string | null
          primary_site_id: string | null
          updated_at: string
          working_days: Json | null
        }
        Insert: {
          contracted_hours?: number | null
          created_at?: string
          email: string
          first_name?: string | null
          id: string
          is_active?: boolean
          job_title_id?: string | null
          last_name?: string | null
          organisation_id?: string | null
          phone?: string | null
          phone_ext?: string | null
          primary_site_id?: string | null
          updated_at?: string
          working_days?: Json | null
        }
        Update: {
          contracted_hours?: number | null
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          is_active?: boolean
          job_title_id?: string | null
          last_name?: string | null
          organisation_id?: string | null
          phone?: string | null
          phone_ext?: string | null
          primary_site_id?: string | null
          updated_at?: string
          working_days?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_job_title_id_fkey"
            columns: ["job_title_id"]
            isOneToOne: false
            referencedRelation: "job_titles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_primary_site_id_fkey"
            columns: ["primary_site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          organisation_id: string | null
          room_type: string | null
          site_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          organisation_id?: string | null
          room_type?: string | null
          site_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          organisation_id?: string | null
          room_type?: string | null
          site_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rooms_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      rota_day_confirmations: {
        Row: {
          confirmed_at: string
          confirmed_by: string
          created_at: string
          id: string
          organisation_id: string
          rota_week_id: string
          shift_date: string
          status: string
          updated_at: string
        }
        Insert: {
          confirmed_at?: string
          confirmed_by: string
          created_at?: string
          id?: string
          organisation_id: string
          rota_week_id: string
          shift_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          confirmed_at?: string
          confirmed_by?: string
          created_at?: string
          id?: string
          organisation_id?: string
          rota_week_id?: string
          shift_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rota_day_confirmations_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rota_day_confirmations_rota_week_id_fkey"
            columns: ["rota_week_id"]
            isOneToOne: false
            referencedRelation: "rota_weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      rota_rule_overrides: {
        Row: {
          created_at: string
          facility_id: string | null
          id: string
          organisation_id: string
          overridden_by: string
          reason: string
          rota_week_id: string
          rule_description: string
          rule_type: string
          shift_date: string | null
        }
        Insert: {
          created_at?: string
          facility_id?: string | null
          id?: string
          organisation_id: string
          overridden_by: string
          reason: string
          rota_week_id: string
          rule_description: string
          rule_type: string
          shift_date?: string | null
        }
        Update: {
          created_at?: string
          facility_id?: string | null
          id?: string
          organisation_id?: string
          overridden_by?: string
          reason?: string
          rota_week_id?: string
          rule_description?: string
          rule_type?: string
          shift_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rota_rule_overrides_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rota_rule_overrides_overridden_by_fkey"
            columns: ["overridden_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rota_rule_overrides_rota_week_id_fkey"
            columns: ["rota_week_id"]
            isOneToOne: false
            referencedRelation: "rota_weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      rota_rules: {
        Row: {
          am_shift_end: string
          am_shift_start: string
          created_at: string
          id: string
          organisation_id: string
          pm_shift_end: string
          pm_shift_start: string
          require_oncall: boolean
          site_id: string
          updated_at: string
        }
        Insert: {
          am_shift_end?: string
          am_shift_start?: string
          created_at?: string
          id?: string
          organisation_id: string
          pm_shift_end?: string
          pm_shift_start?: string
          require_oncall?: boolean
          site_id: string
          updated_at?: string
        }
        Update: {
          am_shift_end?: string
          am_shift_start?: string
          created_at?: string
          id?: string
          organisation_id?: string
          pm_shift_end?: string
          pm_shift_start?: string
          require_oncall?: boolean
          site_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rota_rules_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rota_rules_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: true
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      rota_shifts: {
        Row: {
          created_at: string
          custom_end_time: string | null
          custom_start_time: string | null
          facility_id: string | null
          id: string
          is_oncall: boolean
          is_temp_staff: boolean
          notes: string | null
          organisation_id: string
          rota_week_id: string
          shift_date: string
          shift_type: Database["public"]["Enums"]["shift_type"]
          temp_confirmed: boolean
          temp_staff_name: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          custom_end_time?: string | null
          custom_start_time?: string | null
          facility_id?: string | null
          id?: string
          is_oncall?: boolean
          is_temp_staff?: boolean
          notes?: string | null
          organisation_id: string
          rota_week_id: string
          shift_date: string
          shift_type?: Database["public"]["Enums"]["shift_type"]
          temp_confirmed?: boolean
          temp_staff_name?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          custom_end_time?: string | null
          custom_start_time?: string | null
          facility_id?: string | null
          id?: string
          is_oncall?: boolean
          is_temp_staff?: boolean
          notes?: string | null
          organisation_id?: string
          rota_week_id?: string
          shift_date?: string
          shift_type?: Database["public"]["Enums"]["shift_type"]
          temp_confirmed?: boolean
          temp_staff_name?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rota_shifts_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rota_shifts_rota_week_id_fkey"
            columns: ["rota_week_id"]
            isOneToOne: false
            referencedRelation: "rota_weeks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rota_shifts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rota_staffing_rules: {
        Row: {
          created_at: string
          id: string
          job_title_id: string
          max_staff: number | null
          min_staff: number
          organisation_id: string
          rota_rule_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_title_id: string
          max_staff?: number | null
          min_staff?: number
          organisation_id: string
          rota_rule_id: string
        }
        Update: {
          created_at?: string
          id?: string
          job_title_id?: string
          max_staff?: number | null
          min_staff?: number
          organisation_id?: string
          rota_rule_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rota_staffing_rules_job_title_id_fkey"
            columns: ["job_title_id"]
            isOneToOne: false
            referencedRelation: "job_titles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rota_staffing_rules_rota_rule_id_fkey"
            columns: ["rota_rule_id"]
            isOneToOne: false
            referencedRelation: "rota_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      rota_weeks: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          organisation_id: string
          site_id: string
          status: Database["public"]["Enums"]["rota_status"]
          updated_at: string
          week_start: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          organisation_id: string
          site_id: string
          status?: Database["public"]["Enums"]["rota_status"]
          updated_at?: string
          week_start: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          organisation_id?: string
          site_id?: string
          status?: Database["public"]["Enums"]["rota_status"]
          updated_at?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "rota_weeks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rota_weeks_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rota_weeks_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      secondary_roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          organisation_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          organisation_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          organisation_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_opening_hours: {
        Row: {
          am_close_time: string | null
          am_open_time: string | null
          created_at: string
          day_of_week: number
          id: string
          is_closed: boolean | null
          organisation_id: string | null
          pm_close_time: string | null
          pm_open_time: string | null
          site_id: string
          updated_at: string
        }
        Insert: {
          am_close_time?: string | null
          am_open_time?: string | null
          created_at?: string
          day_of_week: number
          id?: string
          is_closed?: boolean | null
          organisation_id?: string | null
          pm_close_time?: string | null
          pm_open_time?: string | null
          site_id: string
          updated_at?: string
        }
        Update: {
          am_close_time?: string | null
          am_open_time?: string | null
          created_at?: string
          day_of_week?: number
          id?: string
          is_closed?: boolean | null
          organisation_id?: string | null
          pm_close_time?: string | null
          pm_open_time?: string | null
          site_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_opening_hours_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_opening_hours_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      sites: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          organisation_id: string | null
          phone: string | null
          phone_ext: string | null
          site_manager_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          organisation_id?: string | null
          phone?: string | null
          phone_ext?: string | null
          site_manager_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organisation_id?: string | null
          phone?: string | null
          phone_ext?: string | null
          site_manager_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sites_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sites_site_manager_id_fkey"
            columns: ["site_manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_completions: {
        Row: {
          comments: string | null
          completed_at: string
          completed_by: string
          created_at: string
          declaration_confirmed: boolean
          due_date: string
          id: string
          organisation_id: string
          workflow_task_id: string
        }
        Insert: {
          comments?: string | null
          completed_at?: string
          completed_by: string
          created_at?: string
          declaration_confirmed?: boolean
          due_date: string
          id?: string
          organisation_id: string
          workflow_task_id: string
        }
        Update: {
          comments?: string | null
          completed_at?: string
          completed_by?: string
          created_at?: string
          declaration_confirmed?: boolean
          due_date?: string
          id?: string
          organisation_id?: string
          workflow_task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_completions_workflow_task_id_fkey"
            columns: ["workflow_task_id"]
            isOneToOne: false
            referencedRelation: "workflow_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          organisation_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organisation_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organisation_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_secondary_roles: {
        Row: {
          created_at: string
          id: string
          organisation_id: string
          secondary_role_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organisation_id: string
          secondary_role_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organisation_id?: string
          secondary_role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_secondary_roles_secondary_role_id_fkey"
            columns: ["secondary_role_id"]
            isOneToOne: false
            referencedRelation: "secondary_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_tasks: {
        Row: {
          assignee_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          facility_id: string | null
          id: string
          initial_due_date: string
          is_active: boolean
          job_family_id: string | null
          name: string
          organisation_id: string
          recurrence_interval_days: number | null
          recurrence_pattern: Database["public"]["Enums"]["recurrence_pattern"]
          site_id: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          facility_id?: string | null
          id?: string
          initial_due_date: string
          is_active?: boolean
          job_family_id?: string | null
          name: string
          organisation_id: string
          recurrence_interval_days?: number | null
          recurrence_pattern?: Database["public"]["Enums"]["recurrence_pattern"]
          site_id: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          facility_id?: string | null
          id?: string
          initial_due_date?: string
          is_active?: boolean
          job_family_id?: string | null
          name?: string
          organisation_id?: string
          recurrence_interval_days?: number | null
          recurrence_pattern?: Database["public"]["Enums"]["recurrence_pattern"]
          site_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_tasks_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_tasks_job_family_id_fkey"
            columns: ["job_family_id"]
            isOneToOne: false
            referencedRelation: "job_families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_tasks_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_tasks_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_manage_roles: { Args: { _user_id: string }; Returns: boolean }
      check_profile_exists_by_email: {
        Args: { check_email: string }
        Returns: boolean
      }
      get_organisation_options: {
        Args: { p_organisation_id: string }
        Returns: Json
      }
      get_organisation_users: {
        Args: { p_organisation_id: string }
        Returns: {
          contracted_hours: number
          email: string
          first_name: string
          id: string
          is_active: boolean
          job_title_id: string
          job_title_name: string
          last_name: string
          phone: string
          primary_site_id: string
          registration_completed: boolean
          role: string
          secondary_roles: Json
          site_name: string
          working_days: Json
        }[]
      }
      get_user_organisation_id: { Args: { _user_id: string }; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_master: { Args: { _user_id: string }; Returns: boolean }
      validate_invitation_code: {
        Args: { p_code: string; p_email: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "master" | "admin" | "manager" | "staff"
      recurrence_pattern: "daily" | "weekly" | "monthly" | "custom"
      rota_status: "draft" | "published" | "archived"
      shift_type: "full_day" | "am" | "pm" | "custom"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["master", "admin", "manager", "staff"],
      recurrence_pattern: ["daily", "weekly", "monthly", "custom"],
      rota_status: ["draft", "published", "archived"],
      shift_type: ["full_day", "am", "pm", "custom"],
    },
  },
} as const
