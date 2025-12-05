import { useState, useEffect, useMemo } from "react";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent } from "@dnd-kit/core";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, AlertCircle, Send, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganisation } from "@/contexts/OrganisationContext";
import { useRotaSchedule, RotaShift } from "@/hooks/useRotaSchedule";
import { useRotaRules } from "@/hooks/useRotaRules";
import { WeekSelector } from "./WeekSelector";
import { DraggableStaffCard } from "./DraggableStaffCard";
import { DroppableDayCell } from "./DroppableDayCell";
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

  // Drag state
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

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

  // Fetch staff, opening hours, and job titles when site changes
  useEffect(() => {
    const fetchSiteData = async () => {
      if (!selectedSiteId || !organisationId) return;

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
      }
    };

    fetchSiteData();
  }, [selectedSiteId, organisationId]);

  // Calculate scheduled hours per staff
  const staffScheduledHours = useMemo(() => {
    const hours: Record<string, number> = {};

    shifts.forEach((shift) => {
      const dayOfWeek = new Date(shift.shift_date).getDay();
      const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert to Mon=0
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

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragId(null);

    const { active, over } = event;
    if (!over) return;

    const staffId = active.id as string;
    const dropId = over.id as string;
    const dropData = over.data.current as { dateKey?: string; isOnCall?: boolean } | undefined;
    
    // Determine if dropping on on-call zone or regular shift zone
    const isOnCallDrop = dropId.startsWith("oncall-");
    const dateKey = isOnCallDrop ? dropId.replace("oncall-", "") : dropId;

    // Check if the day is closed
    const dropDate = weekDays.find((d) => formatDateKey(d) === dateKey);
    if (!dropDate) return;

    const dayOfWeek = dropDate.getDay();
    const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const dayHours = openingHoursByDay[adjustedDay];

    if (dayHours?.is_closed) {
      toast({
        title: "Cannot assign shift",
        description: "This day is marked as closed",
        variant: "destructive",
      });
      return;
    }

    // Check for duplicate assignment (same staff on same day)
    const existingShift = shiftsByDate[dateKey]?.find((s) => s.user_id === staffId);
    if (existingShift) {
      toast({
        title: "Already assigned",
        description: "This staff member is already scheduled for this day",
        variant: "destructive",
      });
      return;
    }

    // If dropping on on-call zone, check if there's already an on-call assigned
    if (isOnCallDrop) {
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

    // Add shift directly with full_day type (or as on-call)
    const result = await addShift(
      staffId,
      dateKey,
      "full_day",
      undefined,
      undefined,
      isOnCallDrop
    );

    if (result) {
      toast({
        title: isOnCallDrop ? "On-call assigned" : "Shift added",
        description: isOnCallDrop 
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

  const activeStaff = activeDragId ? staff.find((s) => s.id === activeDragId) : null;

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
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
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
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
            {/* Staff Panel */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-4 w-4" />
                  Available Staff
                </CardTitle>
                <CardDescription>Drag staff to the schedule</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[500px] px-4 pb-4">
                  <div className="space-y-2">
                    {staff.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No staff assigned to this site
                      </p>
                    ) : (
                      staff.map((member) => (
                        <DraggableStaffCard
                          key={member.id}
                          staff={member}
                          scheduledHours={staffScheduledHours[member.id] || 0}
                        />
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Schedule Grid */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Weekly Schedule</CardTitle>
                <CardDescription>
                  {!rotaRule && "Configure shift rules in the Rules tab first"}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {loadingSchedule || loadingRules ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="grid grid-cols-7 border-t">
                    {weekDays.map((day) => {
                      const dateKey = formatDateKey(day);
                      const dayOfWeek = day.getDay();
                      const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                      const dayHours = openingHoursByDay[adjustedDay] || { is_closed: true, open_time: null, close_time: null };

                      return (
                        <DroppableDayCell
                          key={dateKey}
                          date={day}
                          dateKey={dateKey}
                          shifts={shiftsByDate[dateKey] || []}
                          openingHours={dayHours}
                          rotaRules={rotaRule}
                          staffingRules={staffingRules}
                          jobTitles={jobTitles}
                          onShiftClick={setEditingShift}
                          onDeleteShift={handleDeleteShift}
                        />
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeStaff && (
          <div className="p-3 rounded-lg border bg-card shadow-lg opacity-90">
            <p className="font-medium text-sm">
              {activeStaff.first_name} {activeStaff.last_name}
            </p>
            <p className="text-xs text-muted-foreground">{activeStaff.job_title_name}</p>
          </div>
        )}
      </DragOverlay>

      {/* Edit Shift Dialog */}
      <EditShiftDialog
        open={!!editingShift}
        onOpenChange={(open) => !open && setEditingShift(null)}
        shift={editingShift}
        rotaRules={rotaRule}
        onSave={handleEditShift}
      />
    </DndContext>
  );
};
