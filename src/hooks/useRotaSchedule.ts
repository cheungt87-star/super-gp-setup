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
  user_id: string | null;
  shift_date: string;
  shift_type: ShiftType;
  custom_start_time: string | null;
  custom_end_time: string | null;
  is_oncall: boolean;
  oncall_slot: number | null;
  notes: string | null;
  facility_id: string | null;
  is_temp_staff: boolean;
  temp_confirmed: boolean;
  temp_staff_name: string | null;
  linked_shift_id: string | null;
  user_name?: string;
  job_title_name?: string;
  job_title_id?: string;
  facility_name?: string;
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
  onShiftChanged?: () => void;
}

export const useRotaSchedule = ({ siteId, organisationId, weekStart, onShiftChanged }: UseRotaScheduleProps) => {
  const [rotaWeek, setRotaWeek] = useState<RotaWeek | null>(null);
  const [shifts, setShifts] = useState<RotaShift[]>([]);
  const [loading, setLoading] = useState(false);
  const [refetching, setRefetching] = useState(false);
  const [saving, setSaving] = useState(false);

  // Reset day confirmation and revert published status when a shift is modified
  const resetDayOnEdit = useCallback(async (shiftDate: string) => {
    if (!rotaWeek) {
      console.log("[resetDayOnEdit] No rotaWeek, skipping");
      return;
    }
    console.log("[resetDayOnEdit] Called for date:", shiftDate, "week status:", rotaWeek.status);
    try {
      // Delete confirmation for this day
      const { error: delError, count } = await supabase
        .from("rota_day_confirmations")
        .delete()
        .eq("rota_week_id", rotaWeek.id)
        .eq("shift_date", shiftDate);

      console.log("[resetDayOnEdit] Delete confirmation result:", { delError, count });

      // If published, revert to draft
      if (rotaWeek.status === "published") {
        const { error: updateError } = await supabase
          .from("rota_weeks")
          .update({ status: "draft" as RotaStatus })
          .eq("id", rotaWeek.id);
        console.log("[resetDayOnEdit] Revert to draft result:", { updateError });
        setRotaWeek({ ...rotaWeek, status: "draft" as RotaStatus });
      }

      // Notify consumers to refetch their state
      console.log("[resetDayOnEdit] Calling onShiftChanged:", !!onShiftChanged);
      onShiftChanged?.();
    } catch (error) {
      console.error("Error resetting day confirmation:", error);
    }
  }, [rotaWeek, onShiftChanged]);

  const fetchSchedule = useCallback(async (silent: boolean = false) => {
    if (!siteId || !organisationId || !weekStart) {
      setRotaWeek(null);
      setShifts([]);
      return;
    }

    if (silent) {
      setRefetching(true);
    } else {
      setLoading(true);
    }
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

      // Fetch shifts with user info and facility info
      const { data: shiftsData, error: shiftsError } = await supabase
        .from("rota_shifts")
        .select(`
          *,
          profiles!rota_shifts_user_id_fkey(first_name, last_name, job_title_id, job_titles(name)),
          facilities(name)
        `)
        .eq("rota_week_id", weekData.id);

      if (shiftsError) throw shiftsError;

      setShifts(
        (shiftsData || []).map((shift: any) => ({
          ...shift,
          linked_shift_id: shift.linked_shift_id || null,
          user_name: shift.is_temp_staff && !shift.user_id && shift.temp_staff_name
            ? shift.temp_staff_name
            : shift.profiles
              ? `${shift.profiles.first_name || ""} ${shift.profiles.last_name || ""}`.trim()
              : "Unknown",
          job_title_name: shift.profiles?.job_titles?.name || "",
          job_title_id: shift.profiles?.job_title_id || null,
          facility_name: shift.facilities?.name || null,
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
      if (silent) {
        setRefetching(false);
      } else {
        setLoading(false);
      }
    }
  }, [siteId, organisationId, weekStart]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  const addShift = async (
    userId: string | null,
    shiftDate: string,
    shiftType: ShiftType,
    customStartTime?: string,
    customEndTime?: string,
    isOncall: boolean = false,
    facilityId?: string,
    isTempStaff: boolean = false,
    tempConfirmed: boolean = false,
    tempStaffName?: string,
    oncallSlot?: number,
    pmBoundary?: string
  ) => {
    if (!rotaWeek || !organisationId) return null;

    // Detect if custom time spans the PM boundary
    const boundary = pmBoundary?.slice(0, 5) || "13:00";
    const spans = shiftType === "custom" && customStartTime && customEndTime && 
      customStartTime.slice(0, 5) < boundary && customEndTime.slice(0, 5) > boundary;

    setSaving(true);
    try {
      if (spans && customStartTime && customEndTime) {
        // Create AM half
        const { data: amData, error: amError } = await supabase
          .from("rota_shifts")
          .insert({
            rota_week_id: rotaWeek.id,
            user_id: userId,
            shift_date: shiftDate,
            shift_type: "custom" as ShiftType,
            custom_start_time: customStartTime,
            custom_end_time: boundary,
            is_oncall: isOncall,
            oncall_slot: isOncall ? (oncallSlot || 1) : null,
            organisation_id: organisationId,
            facility_id: facilityId || null,
            is_temp_staff: isTempStaff,
            temp_confirmed: tempConfirmed,
            temp_staff_name: tempStaffName || null,
          })
          .select()
          .single();
        if (amError) throw amError;

        // Create PM half with linked_shift_id pointing to AM
        const { data: pmData, error: pmError } = await supabase
          .from("rota_shifts")
          .insert({
            rota_week_id: rotaWeek.id,
            user_id: userId,
            shift_date: shiftDate,
            shift_type: "custom" as ShiftType,
            custom_start_time: boundary,
            custom_end_time: customEndTime,
            is_oncall: isOncall,
            oncall_slot: isOncall ? (oncallSlot || 1) : null,
            organisation_id: organisationId,
            facility_id: facilityId || null,
            is_temp_staff: isTempStaff,
            temp_confirmed: tempConfirmed,
            temp_staff_name: tempStaffName || null,
            linked_shift_id: amData.id,
          })
          .select()
          .single();
        if (pmError) throw pmError;

        // Update AM half to link to PM
        await supabase
          .from("rota_shifts")
          .update({ linked_shift_id: pmData.id })
          .eq("id", amData.id);

        await resetDayOnEdit(shiftDate);
        await fetchSchedule(true);
        return amData;
      }

      // Non-spanning: single insert (existing behavior)
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
          oncall_slot: isOncall ? (oncallSlot || 1) : null,
          organisation_id: organisationId,
          facility_id: facilityId || null,
          is_temp_staff: isTempStaff,
          temp_confirmed: tempConfirmed,
          temp_staff_name: tempStaffName || null,
        })
        .select()
        .single();

      if (error) throw error;

      await resetDayOnEdit(shiftDate);
      await fetchSchedule(true);
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
      is_temp_staff?: boolean;
      temp_confirmed?: boolean;
    }
  ) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("rota_shifts")
        .update(updates)
        .eq("id", shiftId);

      if (error) throw error;

      // Find the shift date before it's gone from state
      const shiftToUpdate = shifts.find(s => s.id === shiftId);
      if (shiftToUpdate) {
        await resetDayOnEdit(shiftToUpdate.shift_date);
      }

      await fetchSchedule(true);
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
      // Find linked shift before deleting
      const shiftToDelete = shifts.find(s => s.id === shiftId);
      const linkedId = shiftToDelete?.linked_shift_id;

      const { error } = await supabase.from("rota_shifts").delete().eq("id", shiftId);
      if (error) throw error;

      // Also delete linked shift if exists
      if (linkedId) {
        await supabase.from("rota_shifts").delete().eq("id", linkedId);
      }

      if (shiftToDelete) {
        await resetDayOnEdit(shiftToDelete.shift_date);
      }

      await fetchSchedule(true);
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

  const deleteShiftsForDay = async (shiftDate: string) => {
    if (!rotaWeek) return false;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("rota_shifts")
        .delete()
        .eq("rota_week_id", rotaWeek.id)
        .eq("shift_date", shiftDate);

      if (error) throw error;

      await resetDayOnEdit(shiftDate);
      await fetchSchedule(true);
      toast({
        title: "Day Cleared",
        description: "All shifts for this day have been removed",
      });
      return true;
    } catch (error: any) {
      console.error("Error clearing day:", error);
      toast({
        title: "Error",
        description: "Failed to clear shifts",
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
    refetching,
    saving,
    addShift,
    updateShift,
    deleteShift,
    deleteShiftsForDay,
    updateWeekStatus,
    refetch: fetchSchedule,
  };
};
