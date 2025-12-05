import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatDateKey } from "@/lib/rotaUtils";
import type { Database } from "@/integrations/supabase/types";

type ShiftType = Database["public"]["Enums"]["shift_type"];
type RotaStatus = Database["public"]["Enums"]["rota_status"];

export interface RotaShift {
  id: string;
  rota_week_id: string;
  user_id: string;
  shift_date: string;
  shift_type: ShiftType;
  custom_start_time: string | null;
  custom_end_time: string | null;
  is_oncall: boolean;
  notes: string | null;
  user_name?: string;
  job_title_name?: string;
  job_title_id?: string;
}

export interface RotaWeek {
  id: string;
  site_id: string;
  week_start: string;
  status: RotaStatus;
  created_by: string | null;
}

interface UseRotaScheduleProps {
  siteId: string | null;
  organisationId: string | null;
  weekStart: string | null;
}

export const useRotaSchedule = ({ siteId, organisationId, weekStart }: UseRotaScheduleProps) => {
  const [rotaWeek, setRotaWeek] = useState<RotaWeek | null>(null);
  const [shifts, setShifts] = useState<RotaShift[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchSchedule = useCallback(async () => {
    if (!siteId || !organisationId || !weekStart) {
      setRotaWeek(null);
      setShifts([]);
      return;
    }

    setLoading(true);
    try {
      // Fetch or create rota week
      let { data: weekData, error: weekError } = await supabase
        .from("rota_weeks")
        .select("*")
        .eq("site_id", siteId)
        .eq("week_start", weekStart)
        .maybeSingle();

      if (weekError) throw weekError;

      if (!weekData) {
        // Create new rota week
        const { data: userData } = await supabase.auth.getUser();
        const { data: newWeek, error: createError } = await supabase
          .from("rota_weeks")
          .insert({
            site_id: siteId,
            organisation_id: organisationId,
            week_start: weekStart,
            status: "draft",
            created_by: userData.user?.id,
          })
          .select()
          .single();

        if (createError) throw createError;
        weekData = newWeek;
      }

      setRotaWeek(weekData);

      // Fetch shifts with user info
      const { data: shiftsData, error: shiftsError } = await supabase
        .from("rota_shifts")
        .select(`
          *,
          profiles!rota_shifts_user_id_fkey(first_name, last_name, job_title_id, job_titles(name))
        `)
        .eq("rota_week_id", weekData.id);

      if (shiftsError) throw shiftsError;

      setShifts(
        (shiftsData || []).map((shift: any) => ({
          ...shift,
          user_name: shift.profiles
            ? `${shift.profiles.first_name || ""} ${shift.profiles.last_name || ""}`.trim()
            : "Unknown",
          job_title_name: shift.profiles?.job_titles?.name || "",
          job_title_id: shift.profiles?.job_title_id || null,
        }))
      );
    } catch (error: any) {
      console.error("Error fetching schedule:", error);
      toast({
        title: "Error",
        description: "Failed to load rota schedule",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [siteId, organisationId, weekStart]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  const addShift = async (
    userId: string,
    shiftDate: string,
    shiftType: ShiftType,
    customStartTime?: string,
    customEndTime?: string,
    isOncall: boolean = false
  ) => {
    if (!rotaWeek || !organisationId) return null;

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("rota_shifts")
        .insert({
          rota_week_id: rotaWeek.id,
          user_id: userId,
          shift_date: shiftDate,
          shift_type: shiftType,
          custom_start_time: shiftType === "custom" ? customStartTime : null,
          custom_end_time: shiftType === "custom" ? customEndTime : null,
          is_oncall: isOncall,
          organisation_id: organisationId,
        })
        .select()
        .single();

      if (error) throw error;

      await fetchSchedule();
      return data;
    } catch (error: any) {
      console.error("Error adding shift:", error);
      toast({
        title: "Error",
        description: "Failed to add shift",
        variant: "destructive",
      });
      return null;
    } finally {
      setSaving(false);
    }
  };

  const updateShift = async (
    shiftId: string,
    updates: {
      shift_type?: ShiftType;
      custom_start_time?: string | null;
      custom_end_time?: string | null;
      is_oncall?: boolean;
      notes?: string | null;
    }
  ) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("rota_shifts")
        .update(updates)
        .eq("id", shiftId);

      if (error) throw error;

      await fetchSchedule();
      return true;
    } catch (error: any) {
      console.error("Error updating shift:", error);
      toast({
        title: "Error",
        description: "Failed to update shift",
        variant: "destructive",
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const deleteShift = async (shiftId: string) => {
    setSaving(true);
    try {
      const { error } = await supabase.from("rota_shifts").delete().eq("id", shiftId);

      if (error) throw error;

      await fetchSchedule();
      return true;
    } catch (error: any) {
      console.error("Error deleting shift:", error);
      toast({
        title: "Error",
        description: "Failed to delete shift",
        variant: "destructive",
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const updateWeekStatus = async (status: RotaStatus) => {
    if (!rotaWeek) return false;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("rota_weeks")
        .update({ status })
        .eq("id", rotaWeek.id);

      if (error) throw error;

      setRotaWeek({ ...rotaWeek, status });
      toast({
        title: status === "published" ? "Rota Published" : "Status Updated",
        description: `Rota has been ${status}`,
      });
      return true;
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: "Failed to update rota status",
        variant: "destructive",
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    rotaWeek,
    shifts,
    loading,
    saving,
    addShift,
    updateShift,
    deleteShift,
    updateWeekStatus,
    refetch: fetchSchedule,
  };
};
