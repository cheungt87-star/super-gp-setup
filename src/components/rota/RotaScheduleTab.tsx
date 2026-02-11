import { useState, useEffect, useMemo, useCallback } from "react";
import { format, subWeeks, addDays } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2, AlertCircle, Send, Eye, CheckCircle2, AlertTriangle, Clock, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useOrganisation } from "@/contexts/OrganisationContext";
import { useRotaSchedule, RotaShift } from "@/hooks/useRotaSchedule";
import { useRotaRules } from "@/hooks/useRotaRules";
import { useRotaDayConfirmations, DayOverride } from "@/hooks/useRotaDayConfirmations";
import { useRotaOncalls, RotaOncall } from "@/hooks/useRotaOncalls";
import { WeekSelector } from "./WeekSelector";
import { ClinicRoomDayCell } from "./ClinicRoomDayCell";
import { RotaPreviewDialog } from "./RotaPreviewDialog";
import { EditShiftDialog } from "./EditShiftDialog";
import { DayConfirmDialog } from "./DayConfirmDialog";
import { getWeekDays, getWeekStartDate, formatDateKey, calculateShiftHours } from "@/lib/rotaUtils";
import { validateDay, RuleViolation } from "@/lib/rotaRulesEngine";
import { toast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type ShiftType = Database["public"]["Enums"]["shift_type"];

interface Site {
  id: string;
  name: string;
}

interface StaffMember {
  id: string;
  first_name: string | null;
  last_name: string | null;
  job_title_id: string | null;
  job_title_name: string | null;
  working_days: Record<string, boolean> | null;
  contracted_hours: number | null;
  primary_site_id?: string | null;
}

interface OpeningHour {
  day_of_week: number;
  is_closed: boolean;
  am_open_time: string | null;
  am_close_time: string | null;
  pm_open_time: string | null;
  pm_close_time: string | null;
}

interface ClinicRoom {
  id: string;
  name: string;
  capacity: number;
}

interface JobTitle {
  id: string;
  name: string;
  job_family_id?: string | null;
}

interface JobFamily {
  id: string;
  name: string;
}

export const RotaScheduleTab = () => {
  const { organisationId } = useOrganisation();
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState(getWeekStartDate(new Date()));
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [allStaff, setAllStaff] = useState<StaffMember[]>([]);
  const [jobTitles, setJobTitles] = useState<JobTitle[]>([]);
  const [jobFamilies, setJobFamilies] = useState<JobFamily[]>([]);
  const [openingHours, setOpeningHours] = useState<OpeningHour[]>([]);
  const [clinicRooms, setClinicRooms] = useState<ClinicRoom[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingSiteData, setLoadingSiteData] = useState(false);
  const [crossSiteShifts, setCrossSiteShifts] = useState<RotaShift[]>([]);

  // Edit state
  const [editingShift, setEditingShift] = useState<RotaShift | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  
  // Day confirmation state
  const [confirmingDate, setConfirmingDate] = useState<Date | null>(null);
  const [confirmViolations, setConfirmViolations] = useState<RuleViolation[]>([]);
  
  // Selected day tab index
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);
  
  // Copy from previous week loading state
  const [copyingFromPrevWeek, setCopyingFromPrevWeek] = useState(false);

  const weekStartStr = formatDateKey(weekStart);
  const weekDays = getWeekDays(weekStart);

  // Keep useRotaRules for on-call configuration only
  const { rotaRule, loading: loadingRules } = useRotaRules({
    siteId: selectedSiteId,
    organisationId,
  });

  const { rotaWeek, shifts, loading: loadingSchedule, saving, addShift, updateShift, deleteShift, deleteShiftsForDay, updateWeekStatus } =
    useRotaSchedule({
      siteId: selectedSiteId,
      organisationId,
      weekStart: weekStartStr,
    });

  // Organization-wide on-calls hook
  const {
    oncalls,
    loading: loadingOncalls,
    saving: savingOncalls,
    addOncall,
    deleteOncall,
    deleteOncallsForDay,
    copyOncallsFromDay,
    getOncallsForDate,
    getOncallForSlot,
  } = useRotaOncalls({
    organisationId,
    weekStart: weekStartStr,
  });

  // Day confirmations hook
  const {
    confirmations,
    saving: savingConfirmation,
    confirmDay,
    resetDayConfirmation,
    getConfirmationStatus,
  } = useRotaDayConfirmations({
    rotaWeekId: rotaWeek?.id || null,
    organisationId,
  });

  // Fetch sites, all staff, and job titles
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!organisationId) return;

      try {
        const [sitesRes, allStaffRes, jobTitlesRes, jobFamiliesRes] = await Promise.all([
          supabase
            .from("sites")
            .select("id, name")
            .eq("organisation_id", organisationId)
            .eq("is_active", true)
            .order("name"),
          supabase
            .from("profiles")
            .select("id, first_name, last_name, working_days, contracted_hours, job_title_id, primary_site_id, job_titles(name)")
            .eq("organisation_id", organisationId)
            .eq("is_active", true),
          supabase
            .from("job_titles")
            .select("id, name, job_family_id")
            .eq("organisation_id", organisationId)
            .order("name"),
          supabase
            .from("job_families")
            .select("id, name")
            .eq("organisation_id", organisationId)
            .order("name"),
        ]);

        if (sitesRes.error) throw sitesRes.error;
        if (allStaffRes.error) throw allStaffRes.error;
        if (jobTitlesRes.error) throw jobTitlesRes.error;
        if (jobFamiliesRes.error) throw jobFamiliesRes.error;

        setSites(sitesRes.data || []);
        setAllStaff(
          (allStaffRes.data || []).map((s: any) => ({
            ...s,
            job_title_name: s.job_titles?.name || null,
          }))
        );
        setJobTitles(jobTitlesRes.data || []);
        setJobFamilies(jobFamiliesRes.data || []);

        if (sitesRes.data && sitesRes.data.length > 0 && !selectedSiteId) {
          setSelectedSiteId(sitesRes.data[0].id);
        }
      } catch (error) {
        console.error("Error fetching initial data:", error);
      } finally {
        setLoadingInitial(false);
      }
    };

    fetchInitialData();
  }, [organisationId]);

  // Clear data when site changes to prevent stale data
  useEffect(() => {
    setStaff([]);
    setOpeningHours([]);
    setClinicRooms([]);
  }, [selectedSiteId]);

  // Fetch staff, opening hours, and clinic rooms when site changes
  useEffect(() => {
    const fetchSiteData = async () => {
      if (!selectedSiteId || !organisationId) return;

      setLoadingSiteData(true);
      try {
        const [staffRes, hoursRes, roomsRes] = await Promise.all([
          supabase
            .from("profiles")
            .select("id, first_name, last_name, working_days, contracted_hours, job_title_id, job_titles(name)")
            .eq("organisation_id", organisationId)
            .eq("primary_site_id", selectedSiteId)
            .eq("is_active", true),
          supabase
            .from("site_opening_hours")
            .select("day_of_week, is_closed, am_open_time, am_close_time, pm_open_time, pm_close_time")
            .eq("site_id", selectedSiteId),
          supabase
            .from("facilities")
            .select("id, name, capacity")
            .eq("site_id", selectedSiteId)
            .eq("facility_type", "clinic_room")
            .eq("is_active", true)
            .order("name"),
        ]);

        if (staffRes.error) throw staffRes.error;
        if (hoursRes.error) throw hoursRes.error;
        if (roomsRes.error) throw roomsRes.error;

        setStaff(
          (staffRes.data || []).map((s: any) => ({
            ...s,
            job_title_name: s.job_titles?.name || null,
          }))
        );
        setOpeningHours(hoursRes.data || []);
        setClinicRooms(roomsRes.data || []);
      } catch (error) {
        console.error("Error fetching site data:", error);
      } finally {
        setLoadingSiteData(false);
      }
    };

    fetchSiteData();
  }, [selectedSiteId, organisationId]);

  // Fetch shifts from OTHER sites for the same week (for cross-site conflict checking)
  useEffect(() => {
    const fetchCrossSiteShifts = async () => {
      if (!organisationId || !selectedSiteId || !weekStartStr) {
        setCrossSiteShifts([]);
        return;
      }

      try {
        // Get rota_weeks for other sites in the same week
        const { data: otherRotaWeeks } = await supabase
          .from("rota_weeks")
          .select("id, site_id")
          .eq("organisation_id", organisationId)
          .eq("week_start", weekStartStr)
          .neq("site_id", selectedSiteId);

        if (!otherRotaWeeks || otherRotaWeeks.length === 0) {
          setCrossSiteShifts([]);
          return;
        }

        const otherWeekIds = otherRotaWeeks.map(rw => rw.id);

        const { data: otherShifts } = await supabase
          .from("rota_shifts")
          .select(`
            id, rota_week_id, user_id, shift_date, shift_type,
            custom_start_time, custom_end_time, is_oncall, oncall_slot,
            notes, facility_id, is_temp_staff, temp_confirmed, temp_staff_name,
            profiles(first_name, last_name, job_title_id, job_titles(name)),
            facilities(name)
          `)
          .in("rota_week_id", otherWeekIds);

        const mapped: RotaShift[] = (otherShifts || []).map((s: any) => ({
          id: s.id,
          rota_week_id: s.rota_week_id,
          user_id: s.user_id,
          shift_date: s.shift_date,
          shift_type: s.shift_type,
          custom_start_time: s.custom_start_time,
          custom_end_time: s.custom_end_time,
          is_oncall: s.is_oncall,
          oncall_slot: s.oncall_slot,
          notes: s.notes,
          facility_id: s.facility_id,
          is_temp_staff: s.is_temp_staff,
          temp_confirmed: s.temp_confirmed,
          temp_staff_name: s.temp_staff_name,
          linked_shift_id: s.linked_shift_id || null,
          user_name: s.profiles
            ? `${s.profiles.first_name || ""} ${s.profiles.last_name || ""}`.trim()
            : s.temp_staff_name || undefined,
          job_title_name: s.profiles?.job_titles?.name || undefined,
          job_title_id: s.profiles?.job_title_id || undefined,
          facility_name: s.facilities?.name || undefined,
        }));

        setCrossSiteShifts(mapped);
      } catch (error) {
        console.error("Error fetching cross-site shifts:", error);
        setCrossSiteShifts([]);
      }
    };

    fetchCrossSiteShifts();
  }, [organisationId, selectedSiteId, weekStartStr, shifts]);

  // Calculate scheduled hours per staff
  const staffScheduledHours = useMemo(() => {
    const hours: Record<string, number> = {};

    shifts.forEach((shift) => {
      const dayOfWeek = new Date(shift.shift_date).getDay();
      const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const dayHours = openingHours.find((h) => h.day_of_week === adjustedDay);

      // Derive open/close from AM start and PM end for full day calculations
      const openTime = dayHours?.am_open_time || null;
      const closeTime = dayHours?.pm_close_time || null;

      // Use site opening hours for AM/PM shift times
      const amStart = dayHours?.am_open_time || "09:00";
      const amEnd = dayHours?.am_close_time || "13:00";
      const pmStart = dayHours?.pm_open_time || "13:00";
      const pmEnd = dayHours?.pm_close_time || "18:00";

      const shiftHours = calculateShiftHours(
        shift.shift_type,
        shift.custom_start_time,
        shift.custom_end_time,
        openTime,
        closeTime,
        amStart,
        amEnd,
        pmStart,
        pmEnd
      );

      // Only track hours for staff with user_id (not external temps)
      if (shift.user_id) {
        hours[shift.user_id] = (hours[shift.user_id] || 0) + shiftHours;
      }
    });

    return hours;
  }, [shifts, openingHours]);

  // Group shifts by date
  const shiftsByDate = useMemo(() => {
    const grouped: Record<string, RotaShift[]> = {};
    weekDays.forEach((day) => {
      grouped[formatDateKey(day)] = [];
    });
    shifts.forEach((shift) => {
      if (grouped[shift.shift_date]) {
        grouped[shift.shift_date].push(shift);
      }
    });
    return grouped;
  }, [shifts, weekDays]);

  // Get opening hours by day
  const openingHoursByDay = useMemo(() => {
    const byDay: Record<number, OpeningHour> = {};
    openingHours.forEach((h) => {
      byDay[h.day_of_week] = h;
    });
    return byDay;
  }, [openingHours]);

  // Handle adding on-call (organization-wide)
  const handleAddOncall = async (
    dateKey: string,
    slot: number,
    shiftPeriod: "am" | "pm",
    userId: string | null,
    isTempStaff?: boolean,
    tempConfirmed?: boolean,
    tempStaffName?: string
  ) => {
    const result = await addOncall(dateKey, slot, shiftPeriod, userId, isTempStaff || false, tempConfirmed || false, tempStaffName);
    if (result) {
      const slotLabels: Record<number, string> = { 1: "On Call Manager", 2: "On Duty Doctor 1", 3: "On Duty Doctor 2" };
      const staffLabel = tempStaffName || "Staff member";
      toast({
        title: "On-call assigned",
        description: `${staffLabel} assigned to ${slotLabels[slot]} (${shiftPeriod.toUpperCase()})`,
      });
    }
  };

  // Handle deleting on-call
  const handleDeleteOncall = async (dateKey: string, slot: number, shiftPeriod?: "am" | "pm") => {
    const success = await deleteOncall(dateKey, slot, shiftPeriod);
    if (success) {
      toast({
        title: "On-call removed",
        description: "On-call assignment has been removed",
      });
    }
  };

  const handleAddShift = async (userId: string | null, dateKey: string, shiftType: ShiftType, isOnCall: boolean, facilityId?: string, customStartTime?: string, customEndTime?: string, isTempStaff?: boolean, tempConfirmed?: boolean, tempStaffName?: string, oncallSlot?: number) => {
    // On-calls are now handled separately via handleAddOncall
    if (isOnCall) {
      // Determine the PM boundary for this day
      const dayDate = new Date(dateKey);
      const dayOfWeekNum = dayDate.getDay();
      const adjustedDayNum = dayOfWeekNum === 0 ? 6 : dayOfWeekNum - 1;
      const dayH = openingHoursByDay[adjustedDayNum];
      const pmBoundary = dayH?.pm_open_time?.slice(0, 5) || "13:00";

      // If custom time spans the AM/PM boundary, create both AM and PM on-call entries
      if (customStartTime && customEndTime && customStartTime < pmBoundary && customEndTime > pmBoundary) {
        await handleAddOncall(dateKey, oncallSlot || 1, "am", userId, isTempStaff, tempConfirmed, tempStaffName);
        await handleAddOncall(dateKey, oncallSlot || 1, "pm", userId, isTempStaff, tempConfirmed, tempStaffName);
        return;
      }

      const period = (shiftType === "am" || shiftType === "pm") ? shiftType as "am" | "pm" : "am";
      await handleAddOncall(dateKey, oncallSlot || 1, period, userId, isTempStaff, tempConfirmed, tempStaffName);
      return;
    }

    const dayShifts = shiftsByDate[dateKey] || [];

    // For facility-based scheduling, check conflicts within the same facility (skip for external temps with no userId)
    if (facilityId && userId) {
      const facilityShifts = dayShifts.filter((s) => s.facility_id === facilityId && !s.is_oncall);
      const userFacilityShifts = facilityShifts.filter((s) => s.user_id === userId);
      
      if (shiftType === "full_day") {
        if (userFacilityShifts.length > 0) {
          toast({
            title: "Conflict detected",
            description: "This staff member already has a shift in this room today",
            variant: "destructive",
          });
          return;
        }
      } else if (shiftType === "am" || (shiftType === "custom" && customStartTime && customStartTime < "13:00")) {
        const hasConflict = userFacilityShifts.some((s) => s.shift_type === "am" || s.shift_type === "full_day");
        if (hasConflict) {
          toast({
            title: "Conflict detected",
            description: "This staff member already has an AM or Full Day shift in this room",
            variant: "destructive",
          });
          return;
        }
      } else if (shiftType === "pm" || (shiftType === "custom" && customEndTime && customEndTime > "13:00")) {
        const hasConflict = userFacilityShifts.some((s) => s.shift_type === "pm" || s.shift_type === "full_day");
        if (hasConflict) {
          toast({
            title: "Conflict detected",
            description: "This staff member already has a PM or Full Day shift in this room",
            variant: "destructive",
          });
          return;
        }
      }
    }

    // Check cross-site conflicts (skip for external temps with no userId)
    if (userId) {
      const crossSiteDayShifts = crossSiteShifts.filter(s => s.shift_date === dateKey && s.user_id === userId && !s.is_oncall);
      if (crossSiteDayShifts.length > 0) {
        const hasTimeConflict = crossSiteDayShifts.some(s => {
          if (shiftType === "full_day") return true;
          if (shiftType === "am" && (s.shift_type === "am" || s.shift_type === "full_day")) return true;
          if (shiftType === "pm" && (s.shift_type === "pm" || s.shift_type === "full_day")) return true;
          if (s.shift_type === "full_day") return true;
          return false;
        });
        if (hasTimeConflict) {
          const conflictSiteName = crossSiteDayShifts[0]?.facility_name
            ? `another site (${crossSiteDayShifts[0].facility_name})`
            : "another site";
          toast({
            title: "Cross-site conflict",
            description: `This staff member is already assigned at ${conflictSiteName} for this time slot`,
            variant: "destructive",
          });
          return;
        }
      }
    }

    // Get PM boundary for this day
    const dayDate = new Date(dateKey);
    const dayOfWeekNum = dayDate.getDay();
    const adjustedDayNum = dayOfWeekNum === 0 ? 6 : dayOfWeekNum - 1;
    const dayHoursForBoundary = openingHoursByDay[adjustedDayNum];
    const pmBoundary = dayHoursForBoundary?.pm_open_time?.slice(0, 5) || "13:00";

    const result = await addShift(userId, dateKey, shiftType, customStartTime, customEndTime, false, facilityId, isTempStaff || false, tempConfirmed || false, tempStaffName, undefined, pmBoundary);

    if (result) {
      const shiftLabel = shiftType === "full_day" ? "Full Day" : shiftType.toUpperCase();
      const staffLabel = tempStaffName ? tempStaffName : "Staff member";
      toast({
        title: "Shift added",
        description: `${staffLabel} has been assigned to ${shiftLabel} shift${(isTempStaff || tempStaffName) ? " (Temp)" : ""}`,
      });
    }
  };

  const handleEditShift = async (updates: {
    shift_type: ShiftType;
    custom_start_time: string | null;
    custom_end_time: string | null;
    is_oncall: boolean;
    notes: string | null;
    is_temp_staff: boolean;
    temp_confirmed: boolean;
  }) => {
    if (!editingShift) return;

    // Handle linked shifts: if the shift had a linked partner, delete both and re-add
    if (editingShift.linked_shift_id && updates.shift_type === "custom" && updates.custom_start_time && updates.custom_end_time) {
      // Get PM boundary for this shift's day
      const shiftDay = new Date(editingShift.shift_date);
      const dow = shiftDay.getDay();
      const adj = dow === 0 ? 6 : dow - 1;
      const dayH = openingHoursByDay[adj];
      const pmBound = dayH?.pm_open_time?.slice(0, 5) || "13:00";

      // Delete both halves
      await deleteShift(editingShift.id);
      
      // Re-add as a new shift (addShift handles splitting automatically)
      await addShift(
        editingShift.user_id,
        editingShift.shift_date,
        "custom",
        updates.custom_start_time,
        updates.custom_end_time,
        updates.is_oncall,
        editingShift.facility_id || undefined,
        updates.is_temp_staff,
        updates.temp_confirmed,
        editingShift.temp_staff_name || undefined,
        undefined,
        pmBound
      );
      
      toast({ title: "Shift updated", description: "Shift details have been saved" });
      setEditingShift(null);
      return;
    }

    // For linked shifts changing to non-custom type, delete the linked half
    if (editingShift.linked_shift_id && updates.shift_type !== "custom") {
      const linkedId = editingShift.linked_shift_id;
      // Unlink before updating
      await supabase.from("rota_shifts").update({ linked_shift_id: null }).eq("id", editingShift.id);
      await supabase.from("rota_shifts").delete().eq("id", linkedId);
    }

    const success = await updateShift(editingShift.id, updates);
    if (success) {
      toast({ title: "Shift updated", description: "Shift details have been saved" });
    }
    setEditingShift(null);
  };

  const handleDeleteShift = async (shiftId: string) => {
    const success = await deleteShift(shiftId);
    if (success) {
      toast({
        title: "Shift removed",
        description: "Staff member has been removed from the shift",
      });
    }
  };

  const handleRepeatPreviousDay = async (dateKey: string, previousDateKey: string) => {
    const previousShifts = shiftsByDate[previousDateKey] || [];
    const currentShifts = shiftsByDate[dateKey] || [];
    const previousOncalls = getOncallsForDate(previousDateKey);

    if (previousShifts.length === 0 && previousOncalls.length === 0) {
      toast({
        title: "No shifts to copy",
        description: "The previous day has no shifts assigned",
      });
      return;
    }

    // Delete all existing shifts for the target day first
    for (const shift of currentShifts) {
      await deleteShift(shift.id);
    }

    // Copy on-calls (organization-wide)
    let oncallsCopied = 0;
    if (previousOncalls.length > 0) {
      oncallsCopied = await copyOncallsFromDay(previousDateKey, dateKey);
    }

    // Copy all room shifts from previous day (excluding on-calls which are now separate)
    let shiftsCopied = 0;
    for (const shift of previousShifts) {
      const result = await addShift(
        shift.user_id,
        dateKey,
        shift.shift_type,
        shift.custom_start_time || undefined,
        shift.custom_end_time || undefined,
        false,
        shift.facility_id || undefined,
        shift.is_temp_staff,
        shift.temp_confirmed,
        shift.temp_staff_name || undefined
      );
      if (result) shiftsCopied++;
    }

    const totalCopied = shiftsCopied + oncallsCopied;
    toast({
      title: `Copied ${totalCopied} assignment${totalCopied !== 1 ? "s" : ""}`,
      description: "Previous day's schedule copied (replaced existing)",
    });
  };

  const handleCopyToWholeWeek = async (sourceDateKey: string) => {
    const sourceShifts = shiftsByDate[sourceDateKey] || [];
    const sourceOncalls = getOncallsForDate(sourceDateKey);

    if (sourceShifts.length === 0 && sourceOncalls.length === 0) {
      toast({
        title: "No shifts to copy",
        description: "This day has no shifts assigned",
      });
      return;
    }

    let totalShiftsCopied = 0;
    let totalOncallsCopied = 0;

    // Copy to all remaining open days in the week
    for (let i = 1; i < weekDays.length; i++) {
      const targetDay = weekDays[i];
      const targetDateKey = formatDateKey(targetDay);
      const dayOfWeek = targetDay.getDay();
      const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const dayHours = openingHoursByDay[adjustedDay];

      // Skip closed days
      if (dayHours?.is_closed) continue;

      // Delete all existing shifts for this target day first
      const currentShifts = shiftsByDate[targetDateKey] || [];
      for (const shift of currentShifts) {
        await deleteShift(shift.id);
      }

      // Copy on-calls (organization-wide)
      if (sourceOncalls.length > 0) {
        const oncallsCopied = await copyOncallsFromDay(sourceDateKey, targetDateKey);
        totalOncallsCopied += oncallsCopied;
      }

      // Copy all room shifts from source day
      for (const shift of sourceShifts) {
        const result = await addShift(
          shift.user_id,
          targetDateKey,
          shift.shift_type,
          shift.custom_start_time || undefined,
          shift.custom_end_time || undefined,
          false,
          shift.facility_id || undefined,
          shift.is_temp_staff,
          shift.temp_confirmed,
          shift.temp_staff_name || undefined
        );
        if (result) totalShiftsCopied++;
      }
    }

    const totalCopied = totalShiftsCopied + totalOncallsCopied;
    toast({
      title: `Copied ${totalCopied} assignment${totalCopied !== 1 ? "s" : ""}`,
      description: "Schedule copied to all open days this week (replaced existing)",
    });
  };

  // Handle copy from previous week
  const handleCopyFromPreviousWeek = async () => {
    if (!selectedSiteId || !rotaWeek || !organisationId) return;
    
    setCopyingFromPrevWeek(true);
    try {
      const prevWeekStart = formatDateKey(subWeeks(weekStart, 1));
      
      // Fetch previous week's rota
      const { data: prevWeekData, error: prevWeekError } = await supabase
        .from("rota_weeks")
        .select("id")
        .eq("site_id", selectedSiteId)
        .eq("week_start", prevWeekStart)
        .maybeSingle();
      
      if (prevWeekError) throw prevWeekError;
      
      // Fetch previous week's on-calls (organization-wide)
      const prevWeekDates = getWeekDays(subWeeks(weekStart, 1)).map(formatDateKey);
      const { data: prevOncalls } = await supabase
        .from("rota_oncalls")
        .select("*")
        .eq("organisation_id", organisationId)
        .in("oncall_date", prevWeekDates);
      
      if (!prevWeekData && (!prevOncalls || prevOncalls.length === 0)) {
        toast({
          title: "No previous week",
          description: "No rota exists for the previous week",
        });
        return;
      }

      // Fetch previous week's shifts (if rota exists)
      let prevShifts: any[] = [];
      if (prevWeekData) {
        const { data, error: shiftsError } = await supabase
          .from("rota_shifts")
          .select("*")
          .eq("rota_week_id", prevWeekData.id);
        if (shiftsError) throw shiftsError;
        prevShifts = data || [];
      }
      
      if (prevShifts.length === 0 && (!prevOncalls || prevOncalls.length === 0)) {
        toast({
          title: "No shifts to copy",
          description: "The previous week has no shifts assigned",
        });
        return;
      }
      
      // Delete all existing shifts for the current week first
      for (const shift of shifts) {
        await deleteShift(shift.id);
      }

      // Copy on-calls (adjusted by +7 days)
      let oncallsCopied = 0;
      for (const oc of prevOncalls || []) {
        const newDate = formatDateKey(addDays(new Date(oc.oncall_date), 7));
        const dayOfWeek = new Date(newDate).getDay();
        const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        if (openingHoursByDay[adjustedDay]?.is_closed) continue;
        
        const period = ((oc as any).shift_period === "am" || (oc as any).shift_period === "pm") ? (oc as any).shift_period as "am" | "pm" : "am";
        await deleteOncall(newDate, oc.oncall_slot, period);
        const result = await addOncall(newDate, oc.oncall_slot, period, oc.user_id, oc.is_temp_staff, oc.temp_confirmed, oc.temp_staff_name);
        if (result) oncallsCopied++;
      }

      // Copy each shift, adjusting date by +7 days
      let shiftsCopied = 0;
      for (const shift of prevShifts) {
        const newDate = formatDateKey(addDays(new Date(shift.shift_date), 7));
        const dayOfWeek = new Date(newDate).getDay();
        const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        if (openingHoursByDay[adjustedDay]?.is_closed) continue;
        
        const result = await addShift(
          shift.user_id,
          newDate,
          shift.shift_type,
          shift.custom_start_time || undefined,
          shift.custom_end_time || undefined,
          false,
          shift.facility_id || undefined,
          shift.is_temp_staff,
          shift.temp_confirmed,
          shift.temp_staff_name || undefined
        );
        if (result) shiftsCopied++;
      }
      
      const totalCopied = shiftsCopied + oncallsCopied;
      toast({
        title: `Copied ${totalCopied} assignment${totalCopied !== 1 ? "s" : ""}`,
        description: "Schedule copied from previous week (replaced existing)",
      });
    } catch (error) {
      console.error("Error copying from previous week:", error);
      toast({
        title: "Error",
        description: "Failed to copy from previous week",
        variant: "destructive",
      });
    } finally {
      setCopyingFromPrevWeek(false);
    }
  };

  // Handle confirm day - runs validation and shows dialog
  const handleConfirmDay = useCallback((day: Date) => {
    const dayOfWeek = day.getDay();
    const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const dayHours = openingHoursByDay[adjustedDay];

    const dayOncalls = getOncallsForDate(formatDateKey(day));
    const violations = validateDay(
      day,
      shifts,
      clinicRooms,
      dayHours,
      allStaff,
      selectedSiteId || "",
      rotaRule?.require_oncall ?? true,
      dayOncalls
    );

    setConfirmViolations(violations);
    setConfirmingDate(day);
  }, [shifts, clinicRooms, openingHoursByDay, allStaff, selectedSiteId, rotaRule, getOncallsForDate]);

  const handleDayConfirmed = async (overrides: DayOverride[]) => {
    if (!confirmingDate) return;

    const dateKey = formatDateKey(confirmingDate);
    const status = overrides.length > 0 ? "confirmed_with_overrides" : "confirmed";
    
    const success = await confirmDay(dateKey, status, overrides.length > 0 ? overrides : undefined);
    
    if (success) {
      toast({
        title: "Day confirmed",
        description: overrides.length > 0 
          ? `${format(confirmingDate, "EEEE")} confirmed with ${overrides.length} override${overrides.length !== 1 ? "s" : ""}`
          : `${format(confirmingDate, "EEEE")} confirmed successfully`,
      });
      setConfirmingDate(null);
    }
  };

  const handleResetConfirmation = async (dateKey: string) => {
    const success = await resetDayConfirmation(dateKey);
    if (success) {
      toast({
        title: "Confirmation reset",
        description: "Day is now unconfirmed",
      });
    }
  };

  if (loadingInitial) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (sites.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No sites found. Please create a site first.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Select value={selectedSiteId || ""} onValueChange={setSelectedSiteId}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select site" />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((site) => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <WeekSelector weekStart={weekStart} onWeekChange={setWeekStart} />
            </div>

            <div className="flex items-center gap-2">
              {rotaWeek && (
                <Badge variant={rotaWeek.status === "published" ? "default" : "secondary"}>
                  {rotaWeek.status}
                </Badge>
              )}
              {selectedSiteId && rotaWeek && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreview(true)}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Preview
                </Button>
              )}
              {rotaWeek?.status === "draft" && (() => {
                const openDayDates = weekDays.filter((day) => {
                  const dw = day.getDay();
                  const adj = dw === 0 ? 6 : dw - 1;
                  return !openingHoursByDay[adj]?.is_closed;
                });
                const allDaysCompleted = openDayDates.length > 0 &&
                  openDayDates.every(day => {
                    const s = getConfirmationStatus(formatDateKey(day));
                    return s && s.status;
                  });
                return (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-block">
                          <Button
                            size="sm"
                            onClick={() => updateWeekStatus("published")}
                            disabled={saving || !allDaysCompleted}
                          >
                            {saving ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="mr-2 h-4 w-4" />
                            )}
                            Publish
                          </Button>
                        </span>
                      </TooltipTrigger>
                      {!allDaysCompleted && (
                        <TooltipContent>
                          <p>Can only publish once all days confirmed</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                );
              })()}
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedSiteId && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Weekly Schedule</CardTitle>
                <CardDescription>
                  {clinicRooms.length === 0
                    ? "No clinic rooms configured. Add them in Site Management."
                    : "Click + to add staff to each clinic room"}
                </CardDescription>
              </div>
              {/* Week status + Confirm Day button area */}
              <div className="flex items-center gap-2">
                {/* Week status callout */}
                {(() => {
                  const openDayDates = weekDays.filter((day) => {
                    const dayOfWeek = day.getDay();
                    const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                    const dayHours = openingHoursByDay[adjustedDay];
                    return !dayHours?.is_closed;
                  });
                  
                  const confirmedCount = openDayDates.filter((day) => {
                    const dateKey = formatDateKey(day);
                    const status = getConfirmationStatus(dateKey);
                    return status && status.status;
                  }).length;
                  
                  const totalOpenDays = openDayDates.length;
                  const isCompleted = totalOpenDays > 0 && confirmedCount === totalOpenDays;
                  
                  if (totalOpenDays === 0) return null;
                  
                  return (
                    <div 
                      className={cn(
                        "flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-md border",
                        isCompleted 
                          ? "border-green-300 bg-green-50 text-green-700" 
                          : "border-amber-300 bg-amber-50 text-amber-700"
                      )}
                    >
                      {isCompleted ? (
                        <><CheckCircle2 className="h-3.5 w-3.5" /> Completed</>
                      ) : (
                        <><Clock className="h-3.5 w-3.5" /> In Progress ({confirmedCount}/{totalOpenDays})</>
                      )}
                    </div>
                  );
                })()}
                
                {/* Confirm Day button - dynamically shows for selected day */}
                {(() => {
                  const selectedDay = weekDays[selectedDayIndex];
                  if (!selectedDay) return null;
                  const dateKey = formatDateKey(selectedDay);
                  const confirmation = getConfirmationStatus(dateKey);
                  
                  if (confirmation && confirmation.status) {
                    return (
                      <div className="flex items-center gap-2">
                        <div 
                          className={cn(
                            "flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-md border",
                            confirmation.status === "confirmed" 
                              ? "border-green-300 bg-green-50 text-green-700" 
                              : "border-amber-300 bg-amber-50 text-amber-700"
                          )}
                        >
                          {confirmation.status === "confirmed" ? (
                            <><CheckCircle2 className="h-3.5 w-3.5" /> Day Confirmed</>
                          ) : (
                            <><AlertTriangle className="h-3.5 w-3.5" /> Overrides Applied</>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => handleResetConfirmation(dateKey)}
                          disabled={savingConfirmation}
                        >
                          Reset
                        </Button>
                      </div>
                    );
                  }
                  
                  return (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8"
                      onClick={() => handleConfirmDay(selectedDay)}
                      disabled={savingConfirmation}
                    >
                      {savingConfirmation ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      Confirm Day
                    </Button>
                  );
                })()}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loadingSchedule || loadingRules ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Tabs defaultValue={
                // Find first open day index
                (() => {
                  for (let i = 0; i < weekDays.length; i++) {
                    const dayOfWeek = weekDays[i].getDay();
                    const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                    const dayHours = openingHoursByDay[adjustedDay];
                    if (!dayHours?.is_closed) return String(i);
                  }
                  return "0";
                })()
              } 
              onValueChange={(value) => setSelectedDayIndex(parseInt(value))}
              className="w-full">
                <TabsList className="w-full justify-start h-auto p-1 bg-muted/50 rounded-none border-t">
                  {weekDays.map((day, index) => {
                    const dayOfWeek = day.getDay();
                    const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                    const dayHours = openingHoursByDay[adjustedDay];
                    const isClosed = dayHours?.is_closed ?? true;
                    const dateKey = formatDateKey(day);
                    const confirmation = getConfirmationStatus(dateKey);

                    // Hide closed days
                    if (isClosed) return null;

                    // Compute day status
                    const dayShiftsForStatus = shiftsByDate[dateKey] || [];
                    const hasConfirmation = confirmation?.status;
                    const dayStatus: "not_started" | "in_progress" | "completed" = hasConfirmation
                      ? "completed"
                      : dayShiftsForStatus.length > 0
                        ? "in_progress"
                        : "not_started";

                    return (
                      <TabsTrigger
                        key={index}
                        value={String(index)}
                        className={cn(
                          "flex-1 py-2.5 px-4 rounded-md transition-all border-2",
                          dayStatus === "not_started" && "bg-[#FEE2E2] text-[#991B1B] border-transparent data-[state=active]:border-[#991B1B]",
                          dayStatus === "in_progress" && "bg-[#FEF3C7] text-[#92400E] border-transparent data-[state=active]:border-[#92400E]",
                          dayStatus === "completed" && "bg-[#D1FAE5] text-[#065F46] border-transparent data-[state=active]:border-[#065F46]",
                        )}
                      >
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-sm font-medium">{format(day, "EEE")}</span>
                          <span className="text-xs">{format(day, "do MMM")}</span>
                          <span className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded-full font-semibold mt-0.5",
                            dayStatus === "not_started" && "bg-[#991B1B]/10 text-[#991B1B]",
                            dayStatus === "in_progress" && "bg-[#92400E]/10 text-[#92400E]",
                            dayStatus === "completed" && "bg-[#065F46]/10 text-[#065F46]",
                          )}>
                            {dayStatus === "not_started" ? "Not Started" : dayStatus === "in_progress" ? "In Progress" : "Completed"}
                          </span>
                        </div>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                {weekDays.map((day, index) => {
                  const dateKey = formatDateKey(day);
                  const dayOfWeek = day.getDay();
                  const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                  const dayHours = openingHoursByDay[adjustedDay] ? {
                    is_closed: openingHoursByDay[adjustedDay].is_closed,
                    open_time: openingHoursByDay[adjustedDay].am_open_time,
                    close_time: openingHoursByDay[adjustedDay].pm_close_time,
                    am_open_time: openingHoursByDay[adjustedDay].am_open_time,
                    am_close_time: openingHoursByDay[adjustedDay].am_close_time,
                    pm_open_time: openingHoursByDay[adjustedDay].pm_open_time,
                    pm_close_time: openingHoursByDay[adjustedDay].pm_close_time,
                  } : {
                    is_closed: true,
                    open_time: null,
                    close_time: null,
                    am_open_time: null,
                    am_close_time: null,
                    pm_open_time: null,
                    pm_close_time: null,
                  };
                  const previousDateKey = index > 0 ? formatDateKey(weekDays[index - 1]) : null;
                  const confirmation = getConfirmationStatus(dateKey);

                  // Render confirm button in header via portal-like pattern
                  const isSelectedDay = selectedDayIndex === index;
                  
                  return (
                    <TabsContent key={dateKey} value={String(index)} className="mt-0">
                      {/* Confirm Day Button - rendered inline with CardHeader title */}
                      {isSelectedDay && (
                        <div className="hidden">
                          {/* Portal target - actual button rendered in header */}
                        </div>
                      )}
                      <ClinicRoomDayCell
                        date={day}
                        dateKey={dateKey}
                        shifts={shiftsByDate[dateKey] || []}
                        oncalls={getOncallsForDate(dateKey)}
                        openingHours={dayHours}
                        clinicRooms={clinicRooms}
                        availableStaff={staff}
                        allStaff={allStaff}
                        sites={sites}
                        jobTitles={jobTitles}
                        jobFamilies={jobFamilies}
                        currentSiteId={selectedSiteId!}
                        scheduledHours={staffScheduledHours}
                        requireOnCall={rotaRule?.require_oncall ?? true}
                        loading={loadingSiteData}
                        previousDateKey={previousDateKey}
                        isFirstOpenDay={index === weekDays.findIndex((d) => {
                          const dw = d.getDay();
                          const adj = dw === 0 ? 6 : dw - 1;
                          return !openingHoursByDay[adj]?.is_closed;
                        })}
                        amShiftStart={openingHoursByDay[adjustedDay]?.am_open_time || "09:00"}
                        amShiftEnd={openingHoursByDay[adjustedDay]?.am_close_time || "13:00"}
                        pmShiftStart={openingHoursByDay[adjustedDay]?.pm_open_time || "13:00"}
                        pmShiftEnd={openingHoursByDay[adjustedDay]?.pm_close_time || "18:00"}
                        onAddShift={handleAddShift}
                        onDeleteShift={handleDeleteShift}
                        onEditShift={setEditingShift}
                        onDeleteOncall={handleDeleteOncall}
                        onRepeatPreviousDay={handleRepeatPreviousDay}
                        onCopyToWholeWeek={handleCopyToWholeWeek}
                        onCopyFromPreviousWeek={handleCopyFromPreviousWeek}
                        onClearAll={async (dateKey) => {
                          await deleteShiftsForDay(dateKey);
                          await deleteOncallsForDay(dateKey);
                          // Reset confirmation if it exists
                          if (confirmations.some(c => c.shift_date === dateKey)) {
                            await resetDayConfirmation(dateKey);
                          }
                        }}
                        copyingFromPrevWeek={copyingFromPrevWeek}
                        crossSiteShifts={crossSiteShifts.filter(s => s.shift_date === dateKey)}
                      />
                    </TabsContent>
                  );
                })}
              </Tabs>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Shift Dialog */}
      <EditShiftDialog
        open={!!editingShift}
        onOpenChange={(open) => !open && setEditingShift(null)}
        shift={editingShift}
        allShifts={shifts}
        rotaRules={rotaRule}
        onSave={handleEditShift}
      />

      {/* Day Confirm Dialog */}
      <DayConfirmDialog
        open={!!confirmingDate}
        onOpenChange={(open) => !open && setConfirmingDate(null)}
        date={confirmingDate || new Date()}
        violations={confirmViolations}
        saving={savingConfirmation}
        onConfirm={handleDayConfirmed}
        onFix={() => setConfirmingDate(null)}
      />

      {/* Preview Dialog */}
      <RotaPreviewDialog
        open={showPreview}
        onOpenChange={setShowPreview}
        shifts={shifts}
        clinicRooms={clinicRooms}
        weekDays={weekDays}
        openingHoursByDay={openingHoursByDay}
        currentSiteId={selectedSiteId || ""}
        allStaff={allStaff}
        requireOnCall={rotaRule?.require_oncall ?? true}
        oncalls={oncalls}
        onPublish={rotaWeek?.status === "draft" ? (() => {
          const openDayDates = weekDays.filter((day) => {
            const dw = day.getDay();
            const adj = dw === 0 ? 6 : dw - 1;
            return !openingHoursByDay[adj]?.is_closed;
          });
          const allCompleted = openDayDates.length > 0 &&
            openDayDates.every(day => {
              const s = getConfirmationStatus(formatDateKey(day));
              return s && s.status;
            });
          return allCompleted ? () => {
            updateWeekStatus("published");
            setShowPreview(false);
          } : undefined;
        })() : undefined}
        saving={saving}
      />
    </div>
  );
};
