import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganisation } from "@/contexts/OrganisationContext";
import { useRotaSchedule, RotaShift } from "@/hooks/useRotaSchedule";
import { useRotaRules } from "@/hooks/useRotaRules";
import { WeekSelector } from "./WeekSelector";
import { RoleDayCell } from "./RoleDayCell";
import { EditShiftDialog } from "./EditShiftDialog";
import { getWeekDays, getWeekStartDate, formatDateKey, calculateShiftHours } from "@/lib/rotaUtils";
import { toast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type ShiftType = Database["public"]["Enums"]["shift_type"];

interface JobTitle {
  id: string;
  name: string;
}

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
}

interface OpeningHour {
  day_of_week: number;
  is_closed: boolean;
  open_time: string | null;
  close_time: string | null;
}

export const RotaScheduleTab = () => {
  const { organisationId } = useOrganisation();
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState(getWeekStartDate(new Date()));
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [openingHours, setOpeningHours] = useState<OpeningHour[]>([]);
  const [jobTitles, setJobTitles] = useState<JobTitle[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingSiteData, setLoadingSiteData] = useState(false);

  // Edit state
  const [editingShift, setEditingShift] = useState<RotaShift | null>(null);

  const weekStartStr = formatDateKey(weekStart);
  const weekDays = getWeekDays(weekStart);

  const { rotaRule, staffingRules, loading: loadingRules } = useRotaRules({
    siteId: selectedSiteId,
    organisationId,
  });

  const { rotaWeek, shifts, loading: loadingSchedule, saving, addShift, updateShift, deleteShift, updateWeekStatus } =
    useRotaSchedule({
      siteId: selectedSiteId,
      organisationId,
      weekStart: weekStartStr,
    });

  // Fetch sites
  useEffect(() => {
    const fetchSites = async () => {
      if (!organisationId) return;

      try {
        const { data, error } = await supabase
          .from("sites")
          .select("id, name")
          .eq("organisation_id", organisationId)
          .eq("is_active", true)
          .order("name");

        if (error) throw error;
        setSites(data || []);

        if (data && data.length > 0 && !selectedSiteId) {
          setSelectedSiteId(data[0].id);
        }
      } catch (error) {
        console.error("Error fetching sites:", error);
      } finally {
        setLoadingInitial(false);
      }
    };

    fetchSites();
  }, [organisationId]);

  // Clear staff when site changes to prevent stale data
  useEffect(() => {
    setStaff([]);
    setOpeningHours([]);
  }, [selectedSiteId]);

  // Fetch staff, opening hours, and job titles when site changes
  useEffect(() => {
    const fetchSiteData = async () => {
      if (!selectedSiteId || !organisationId) return;

      setLoadingSiteData(true);
      try {
        const [staffRes, hoursRes, jobTitlesRes] = await Promise.all([
          supabase
            .from("profiles")
            .select("id, first_name, last_name, working_days, contracted_hours, job_title_id, job_titles(name)")
            .eq("organisation_id", organisationId)
            .eq("primary_site_id", selectedSiteId)
            .eq("is_active", true),
          supabase
            .from("site_opening_hours")
            .select("day_of_week, is_closed, open_time, close_time")
            .eq("site_id", selectedSiteId),
          supabase
            .from("job_titles")
            .select("id, name")
            .eq("organisation_id", organisationId),
        ]);

        if (staffRes.error) throw staffRes.error;
        if (hoursRes.error) throw hoursRes.error;
        if (jobTitlesRes.error) throw jobTitlesRes.error;

        setStaff(
          (staffRes.data || []).map((s: any) => ({
            ...s,
            job_title_name: s.job_titles?.name || null,
          }))
        );
        setOpeningHours(hoursRes.data || []);
        setJobTitles(jobTitlesRes.data || []);
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

      const shiftHours = calculateShiftHours(
        shift.shift_type,
        shift.custom_start_time,
        shift.custom_end_time,
        dayHours?.open_time || null,
        dayHours?.close_time || null,
        rotaRule?.am_shift_start || "09:00",
        rotaRule?.am_shift_end || "13:00",
        rotaRule?.pm_shift_start || "13:00",
        rotaRule?.pm_shift_end || "18:00"
      );

      hours[shift.user_id] = (hours[shift.user_id] || 0) + shiftHours;
    });

    return hours;
  }, [shifts, openingHours, rotaRule]);

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

  const handleAddShift = async (userId: string, dateKey: string, isOnCall: boolean) => {
    // Check for duplicate assignment
    const existingShift = shiftsByDate[dateKey]?.find((s) => s.user_id === userId);
    if (existingShift) {
      toast({
        title: "Already assigned",
        description: "This staff member is already scheduled for this day",
        variant: "destructive",
      });
      return;
    }

    // If adding on-call, check if there's already one
    if (isOnCall) {
      const existingOnCall = shiftsByDate[dateKey]?.find((s) => s.is_oncall);
      if (existingOnCall) {
        toast({
          title: "On-call already assigned",
          description: "Remove the current on-call assignment first",
          variant: "destructive",
        });
        return;
      }
    }

    const result = await addShift(userId, dateKey, "full_day", undefined, undefined, isOnCall);

    if (result) {
      toast({
        title: isOnCall ? "On-call assigned" : "Shift added",
        description: isOnCall
          ? "Staff member has been assigned as on-call"
          : "Staff member has been assigned to a full day shift",
      });
    }
  };

  const handleEditShift = async (updates: {
    shift_type: ShiftType;
    custom_start_time: string | null;
    custom_end_time: string | null;
    is_oncall: boolean;
    notes: string | null;
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
    const currentUserIds = new Set(currentShifts.map((s) => s.user_id));

    if (previousShifts.length === 0) {
      toast({
        title: "No shifts to copy",
        description: "The previous day has no shifts assigned",
      });
      return;
    }

    let copiedCount = 0;
    for (const shift of previousShifts) {
      // Skip if user already assigned today
      if (currentUserIds.has(shift.user_id)) continue;

      // If on-call, check if there's already one assigned
      if (shift.is_oncall) {
        const existingOnCall = currentShifts.find((s) => s.is_oncall);
        if (existingOnCall) continue;
      }

      const result = await addShift(
        shift.user_id,
        dateKey,
        shift.shift_type,
        shift.custom_start_time || undefined,
        shift.custom_end_time || undefined,
        shift.is_oncall
      );
      if (result) copiedCount++;
    }

    toast({
      title: copiedCount > 0 ? `Copied ${copiedCount} shift${copiedCount > 1 ? "s" : ""}` : "No shifts copied",
      description:
        copiedCount === 0
          ? "All staff from the previous day are already assigned"
          : "Shifts copied from the previous day",
    });
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
            <CardTitle className="text-base">Weekly Schedule</CardTitle>
            <CardDescription>
              {!rotaRule
                ? "Configure shift rules in the Rules tab first"
                : staffingRules.length === 0
                ? "Add staffing requirements in the Rules tab"
                : "Click + to add staff to each role"}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loadingSchedule || loadingRules ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-7 border-t">
                {weekDays.map((day, index) => {
                  const dateKey = formatDateKey(day);
                  const dayOfWeek = day.getDay();
                  const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                  const dayHours = openingHoursByDay[adjustedDay] || {
                    is_closed: true,
                    open_time: null,
                    close_time: null,
                  };
                  const previousDateKey = index > 0 ? formatDateKey(weekDays[index - 1]) : null;

                  return (
                    <RoleDayCell
                      key={dateKey}
                      date={day}
                      dateKey={dateKey}
                      shifts={shiftsByDate[dateKey] || []}
                      openingHours={dayHours}
                      staffingRules={staffingRules}
                      jobTitles={jobTitles}
                      availableStaff={staff}
                      scheduledHours={staffScheduledHours}
                      requireOnCall={rotaRule?.require_oncall ?? false}
                      loading={loadingSiteData}
                      previousDateKey={previousDateKey}
                      onAddShift={handleAddShift}
                      onDeleteShift={handleDeleteShift}
                      onEditShift={setEditingShift}
                      onRepeatPreviousDay={handleRepeatPreviousDay}
                    />
                  );
                })}
              </div>
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
    </div>
  );
};
