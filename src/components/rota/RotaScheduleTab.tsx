import { useState, useEffect, useMemo, useCallback } from "react";
import { format, subWeeks, addDays } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, Send, Eye, CheckCircle2, AlertTriangle, Clock, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useOrganisation } from "@/contexts/OrganisationContext";
import { useRotaSchedule, RotaShift } from "@/hooks/useRotaSchedule";
import { useRotaRules } from "@/hooks/useRotaRules";
import { useRotaDayConfirmations, DayOverride } from "@/hooks/useRotaDayConfirmations";
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

  const handleAddShift = async (userId: string | null, dateKey: string, shiftType: ShiftType, isOnCall: boolean, facilityId?: string, customStartTime?: string, customEndTime?: string, isTempStaff?: boolean, tempConfirmed?: boolean, tempStaffName?: string) => {
    const dayShifts = shiftsByDate[dateKey] || [];
    
    // If adding on-call, check if there's already one
    if (isOnCall) {
      const existingOnCall = dayShifts.find((s) => s.is_oncall);
      if (existingOnCall) {
        toast({
          title: "On-call already assigned",
          description: "Remove the current on-call assignment first",
          variant: "destructive",
        });
        return;
      }
    }

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

    const result = await addShift(userId, dateKey, shiftType, customStartTime, customEndTime, isOnCall, facilityId, isTempStaff || false, tempConfirmed || false, tempStaffName);

    if (result) {
      const shiftLabel = isOnCall ? "On-call" : shiftType === "full_day" ? "Full Day" : shiftType.toUpperCase();
      const staffLabel = tempStaffName ? tempStaffName : "Staff member";
      toast({
        title: isOnCall ? "On-call assigned" : "Shift added",
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

    const success = await updateShift(editingShift.id, updates);
    if (success) {
      toast({
        title: "Shift updated",
        description: "Shift details have been saved",
      });
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

    if (previousShifts.length === 0) {
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

    // Copy all shifts from previous day
    let copiedCount = 0;
    for (const shift of previousShifts) {
      const result = await addShift(
        shift.user_id,
        dateKey,
        shift.shift_type,
        shift.custom_start_time || undefined,
        shift.custom_end_time || undefined,
        shift.is_oncall,
        shift.facility_id || undefined,
        shift.is_temp_staff,
        shift.temp_confirmed,
        shift.temp_staff_name || undefined
      );
      if (result) copiedCount++;
    }

    toast({
      title: `Copied ${copiedCount} shift${copiedCount !== 1 ? "s" : ""}`,
      description: "Previous day's schedule copied (replaced existing shifts)",
    });
  };

  const handleCopyToWholeWeek = async (sourceDateKey: string) => {
    const sourceShifts = shiftsByDate[sourceDateKey] || [];

    if (sourceShifts.length === 0) {
      toast({
        title: "No shifts to copy",
        description: "This day has no shifts assigned",
      });
      return;
    }

    let totalCopied = 0;

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

      // Copy all shifts from source day
      for (const shift of sourceShifts) {
        const result = await addShift(
          shift.user_id,
          targetDateKey,
          shift.shift_type,
          shift.custom_start_time || undefined,
          shift.custom_end_time || undefined,
          shift.is_oncall,
          shift.facility_id || undefined,
          shift.is_temp_staff,
          shift.temp_confirmed,
          shift.temp_staff_name || undefined
        );
        if (result) totalCopied++;
      }
    }

    toast({
      title: `Copied ${totalCopied} shift${totalCopied !== 1 ? "s" : ""}`,
      description: "Schedule copied to all open days this week (replaced existing shifts)",
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
      
      if (!prevWeekData) {
        toast({
          title: "No previous week",
          description: "No rota exists for the previous week",
        });
        return;
      }
      
      // Fetch previous week's shifts
      const { data: prevShifts, error: shiftsError } = await supabase
        .from("rota_shifts")
        .select("*")
        .eq("rota_week_id", prevWeekData.id);
      
      if (shiftsError) throw shiftsError;
      
      if (!prevShifts || prevShifts.length === 0) {
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

      // Copy each shift, adjusting date by +7 days
      let copiedCount = 0;
      for (const shift of prevShifts) {
        const newDate = formatDateKey(addDays(new Date(shift.shift_date), 7));
        
        // Check if day is closed
        const dayOfWeek = new Date(newDate).getDay();
        const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        if (openingHoursByDay[adjustedDay]?.is_closed) continue;
        
        // Add shift
        const result = await addShift(
          shift.user_id,
          newDate,
          shift.shift_type,
          shift.custom_start_time || undefined,
          shift.custom_end_time || undefined,
          shift.is_oncall,
          shift.facility_id || undefined,
          shift.is_temp_staff,
          shift.temp_confirmed,
          shift.temp_staff_name || undefined
        );
        if (result) copiedCount++;
      }
      
      toast({
        title: `Copied ${copiedCount} shift${copiedCount !== 1 ? "s" : ""}`,
        description: "Schedule copied from previous week (replaced existing shifts)",
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

    const violations = validateDay(
      day,
      shifts,
      clinicRooms,
      dayHours,
      allStaff,
      selectedSiteId || "",
      rotaRule?.require_oncall ?? true
    );

    setConfirmViolations(violations);
    setConfirmingDate(day);
  }, [shifts, clinicRooms, openingHoursByDay, allStaff, selectedSiteId, rotaRule]);

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
              {rotaWeek?.status === "draft" && (
                <Button
                  size="sm"
                  onClick={() => updateWeekStatus("published")}
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Publish
                </Button>
              )}
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

                    return (
                      <TabsTrigger
                        key={index}
                        value={String(index)}
                        className="flex-1 py-2.5 px-4 rounded-md transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-muted/60"
                      >
                        <div className="flex flex-col items-center gap-0.5">
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-medium">{format(day, "EEE")}</span>
                            {confirmation?.status === "confirmed" && (
                              <CheckCircle2 className="h-3 w-3 text-green-500 data-[state=active]:text-green-200" />
                            )}
                            {confirmation?.status === "confirmed_with_overrides" && (
                              <AlertTriangle className="h-3 w-3 text-amber-500 data-[state=active]:text-amber-200" />
                            )}
                          </div>
                          <span className="text-xs">{format(day, "do MMM")}</span>
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
                        onRepeatPreviousDay={handleRepeatPreviousDay}
                        onCopyToWholeWeek={handleCopyToWholeWeek}
                        onCopyFromPreviousWeek={handleCopyFromPreviousWeek}
                        onClearAll={async (dateKey) => {
                          await deleteShiftsForDay(dateKey);
                          // Reset confirmation if it exists
                          if (confirmations.some(c => c.shift_date === dateKey)) {
                            await resetDayConfirmation(dateKey);
                          }
                        }}
                        copyingFromPrevWeek={copyingFromPrevWeek}
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
        onPublish={rotaWeek?.status === "draft" ? () => {
          updateWeekStatus("published");
          setShowPreview(false);
        } : undefined}
        saving={saving}
      />
    </div>
  );
};
