import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useOrganisation } from "@/contexts/OrganisationContext";
import { useRotaSchedule, RotaShift } from "@/hooks/useRotaSchedule";
import { useRotaRules } from "@/hooks/useRotaRules";
import { WeekSelector } from "./WeekSelector";
import { ClinicRoomDayCell } from "./ClinicRoomDayCell";
import { EditShiftDialog } from "./EditShiftDialog";
import { getWeekDays, getWeekStartDate, formatDateKey, calculateShiftHours } from "@/lib/rotaUtils";
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

export const RotaScheduleTab = () => {
  const { organisationId } = useOrganisation();
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState(getWeekStartDate(new Date()));
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [openingHours, setOpeningHours] = useState<OpeningHour[]>([]);
  const [clinicRooms, setClinicRooms] = useState<ClinicRoom[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingSiteData, setLoadingSiteData] = useState(false);

  // Edit state
  const [editingShift, setEditingShift] = useState<RotaShift | null>(null);

  const weekStartStr = formatDateKey(weekStart);
  const weekDays = getWeekDays(weekStart);

  // Keep useRotaRules for on-call configuration only
  const { rotaRule, loading: loadingRules } = useRotaRules({
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

      hours[shift.user_id] = (hours[shift.user_id] || 0) + shiftHours;
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

  const handleAddShift = async (userId: string, dateKey: string, shiftType: ShiftType, isOnCall: boolean, facilityId?: string) => {
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

    // For facility-based scheduling, check conflicts within the same facility
    if (facilityId) {
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
      } else if (shiftType === "am") {
        const hasConflict = userFacilityShifts.some((s) => s.shift_type === "am" || s.shift_type === "full_day");
        if (hasConflict) {
          toast({
            title: "Conflict detected",
            description: "This staff member already has an AM or Full Day shift in this room",
            variant: "destructive",
          });
          return;
        }
      } else if (shiftType === "pm") {
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

    const result = await addShift(userId, dateKey, shiftType, undefined, undefined, isOnCall, facilityId);

    if (result) {
      const shiftLabel = isOnCall ? "On-call" : shiftType === "full_day" ? "Full Day" : shiftType.toUpperCase();
      toast({
        title: isOnCall ? "On-call assigned" : "Shift added",
        description: `Staff member has been assigned to ${shiftLabel} shift`,
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
      // If on-call, check if there's already one assigned
      if (shift.is_oncall) {
        const existingOnCall = currentShifts.find((s) => s.is_oncall);
        if (existingOnCall) continue;
      }

      // For facility-based shifts, check if same user+facility+type already exists
      if (shift.facility_id) {
        const alreadyExists = currentShifts.some(
          (s) => s.user_id === shift.user_id && s.facility_id === shift.facility_id && s.shift_type === shift.shift_type
        );
        if (alreadyExists) continue;
      }

      const result = await addShift(
        shift.user_id,
        dateKey,
        shift.shift_type,
        shift.custom_start_time || undefined,
        shift.custom_end_time || undefined,
        shift.is_oncall,
        shift.facility_id || undefined
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
              {clinicRooms.length === 0
                ? "No clinic rooms configured. Add them in Site Management."
                : "Click + to add staff to each clinic room"}
            </CardDescription>
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
              } className="w-full">
                <TabsList className="w-full justify-start h-auto p-1 bg-muted/50 rounded-none border-t">
                  {weekDays.map((day, index) => {
                    const dayOfWeek = day.getDay();
                    const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                    const dayHours = openingHoursByDay[adjustedDay];
                    const isClosed = dayHours?.is_closed ?? true;

                    // Hide closed days
                    if (isClosed) return null;

                    return (
                      <TabsTrigger
                        key={index}
                        value={String(index)}
                        className="flex-1 py-2 px-3 data-[state=active]:bg-background"
                      >
                        <div className="flex flex-col items-center">
                          <span className="text-xs">{format(day, "EEE")}</span>
                          <span className="font-semibold">{format(day, "d")}</span>
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

                  return (
                    <TabsContent key={dateKey} value={String(index)} className="mt-0">
                      <ClinicRoomDayCell
                        date={day}
                        dateKey={dateKey}
                        shifts={shiftsByDate[dateKey] || []}
                        openingHours={dayHours}
                        clinicRooms={clinicRooms}
                        availableStaff={staff}
                        scheduledHours={staffScheduledHours}
                        requireOnCall={rotaRule?.require_oncall ?? true}
                        loading={loadingSiteData}
                        previousDateKey={previousDateKey}
                        amShiftStart={openingHoursByDay[adjustedDay]?.am_open_time || "09:00"}
                        amShiftEnd={openingHoursByDay[adjustedDay]?.am_close_time || "13:00"}
                        pmShiftStart={openingHoursByDay[adjustedDay]?.pm_open_time || "13:00"}
                        pmShiftEnd={openingHoursByDay[adjustedDay]?.pm_close_time || "18:00"}
                        onAddShift={handleAddShift}
                        onDeleteShift={handleDeleteShift}
                        onEditShift={setEditingShift}
                        onRepeatPreviousDay={handleRepeatPreviousDay}
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
    </div>
  );
};
