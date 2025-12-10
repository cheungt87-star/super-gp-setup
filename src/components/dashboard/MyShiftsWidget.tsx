import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar, DoorOpen, Sun, Moon, Clock, Phone, Users } from "lucide-react";
import { WeekSelector } from "@/components/rota/WeekSelector";
import { getWeekStartDate, getWeekDays, formatDateKey } from "@/lib/rotaUtils";
import { format } from "date-fns";

interface ShiftData {
  id: string;
  shift_date: string;
  shift_type: string;
  custom_start_time: string | null;
  custom_end_time: string | null;
  is_oncall: boolean;
  facility_id: string | null;
  facility?: { name: string } | null;
  user_id: string | null;
}

interface ColleagueShift {
  id: string;
  shift_date: string;
  shift_type: string;
  custom_start_time: string | null;
  custom_end_time: string | null;
  facility_id: string | null;
  user_id: string | null;
  profiles?: { first_name: string | null; last_name: string | null } | null;
}

interface OnCallAssignment {
  slot: number;
  slotLabel: string;
}

interface DayShifts {
  date: Date;
  dateKey: string;
  isClosed: boolean;
  onCallAssignments: OnCallAssignment[];
  shifts: {
    id: string;
    facilityName: string | null;
    shiftType: string;
    timeDisplay: string;
    isOnCall: boolean;
    colleagues: string[];
  }[];
}

interface OpeningHours {
  day_of_week: number;
  is_closed: boolean | null;
  am_open_time: string | null;
  am_close_time: string | null;
  pm_open_time: string | null;
  pm_close_time: string | null;
}

const getOrdinalSuffix = (day: number): string => {
  if (day > 3 && day < 21) return "th";
  switch (day % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
};

const formatDayDisplay = (date: Date): string => {
  const day = date.getDate();
  return `${format(date, "EEE")} ${day}${getOrdinalSuffix(day)} ${format(date, "MMM")}`;
};

const getShiftTimeDisplay = (
  shiftType: string,
  customStart: string | null,
  customEnd: string | null,
  openingHours: OpeningHours | null
): string => {
  switch (shiftType) {
    case "full_day":
      return "Full Day";
    case "am":
      if (openingHours?.am_open_time && openingHours?.am_close_time) {
        return `AM (${openingHours.am_open_time.slice(0, 5)}-${openingHours.am_close_time.slice(0, 5)})`;
      }
      return "AM";
    case "pm":
      if (openingHours?.pm_open_time && openingHours?.pm_close_time) {
        return `PM (${openingHours.pm_open_time.slice(0, 5)}-${openingHours.pm_close_time.slice(0, 5)})`;
      }
      return "PM";
    case "custom":
      if (customStart && customEnd) {
        return `${customStart.slice(0, 5)}-${customEnd.slice(0, 5)}`;
      }
      return "Custom";
    default:
      return shiftType;
  }
};

export const MyShiftsWidget = () => {
  const [weekStart, setWeekStart] = useState(() => getWeekStartDate(new Date()));
  const [loading, setLoading] = useState(true);
  const [dayShifts, setDayShifts] = useState<DayShifts[]>([]);
  const [rotaExists, setRotaExists] = useState(true);
  const [primarySiteId, setPrimarySiteId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const fetchShifts = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      const currentUserId = session.user.id;
      setUserId(currentUserId);

      // Get user's primary site and organisation
      const { data: profile } = await supabase
        .from("profiles")
        .select("primary_site_id, organisation_id")
        .eq("id", currentUserId)
        .maybeSingle();

      if (!profile?.primary_site_id) {
        setLoading(false);
        setRotaExists(false);
        return;
      }

      const siteId = profile.primary_site_id;
      const organisationId = profile.organisation_id;
      setPrimarySiteId(siteId);

      const weekStartKey = formatDateKey(weekStart);

      // Check if rota exists for this week
      const { data: rotaWeek } = await supabase
        .from("rota_weeks")
        .select("id")
        .eq("site_id", siteId)
        .eq("week_start", weekStartKey)
        .maybeSingle();

      if (!rotaWeek) {
        setRotaExists(false);
        setDayShifts([]);
        setLoading(false);
        return;
      }

      setRotaExists(true);

      // Fetch opening hours for the site
      const { data: openingHoursData } = await supabase
        .from("site_opening_hours")
        .select("day_of_week, is_closed, am_open_time, am_close_time, pm_open_time, pm_close_time")
        .eq("site_id", siteId);

      const openingHoursMap = new Map<number, OpeningHours>();
      (openingHoursData || []).forEach(oh => {
        openingHoursMap.set(oh.day_of_week, oh);
      });

      // Fetch user's shifts for this week
      const weekDays = getWeekDays(weekStart);
      const dateKeys = weekDays.map(formatDateKey);

      const { data: myShifts } = await supabase
        .from("rota_shifts")
        .select(`
          id,
          shift_date,
          shift_type,
          custom_start_time,
          custom_end_time,
          is_oncall,
          facility_id,
          facilities(name)
        `)
        .eq("rota_week_id", rotaWeek.id)
        .eq("user_id", currentUserId)
        .in("shift_date", dateKeys);

      // Fetch colleague shifts (same facility, same dates)
      const facilityIds = (myShifts || [])
        .filter(s => s.facility_id)
        .map(s => s.facility_id as string);

      let colleagueShifts: ColleagueShift[] = [];
      if (facilityIds.length > 0) {
        const { data: colleagues } = await supabase
          .from("rota_shifts")
          .select(`
            id,
            shift_date,
            shift_type,
            custom_start_time,
            custom_end_time,
            facility_id,
            user_id,
            profiles(first_name, last_name)
          `)
          .eq("rota_week_id", rotaWeek.id)
          .neq("user_id", currentUserId)
          .in("facility_id", facilityIds)
          .in("shift_date", dateKeys);

        colleagueShifts = (colleagues || []) as unknown as ColleagueShift[];
      }

      // Fetch user's on-call assignments from rota_oncalls
      let onCallData: { oncall_date: string; oncall_slot: number }[] = [];
      if (organisationId) {
        const { data: onCalls } = await supabase
          .from("rota_oncalls")
          .select("oncall_date, oncall_slot")
          .eq("organisation_id", organisationId)
          .eq("user_id", currentUserId)
          .in("oncall_date", dateKeys);
        
        onCallData = onCalls || [];
      }

      // Helper to get slot label
      const getSlotLabel = (slot: number): string => {
        switch (slot) {
          case 1: return "On Call Manager";
          case 2: return "On Duty Doctor 1";
          case 3: return "On Duty Doctor 2";
          default: return `On Call ${slot}`;
        }
      };

      // Build day shifts data
      const result: DayShifts[] = weekDays.map((date, index) => {
        const dateKey = formatDateKey(date);
        const dayOfWeek = index; // 0 = Monday
        const openingHours = openingHoursMap.get(dayOfWeek);
        const isClosed = openingHours?.is_closed ?? false;

        // Get on-call assignments for this day
        const dayOnCalls = onCallData
          .filter(oc => oc.oncall_date === dateKey)
          .map(oc => ({
            slot: oc.oncall_slot,
            slotLabel: getSlotLabel(oc.oncall_slot),
          }))
          .sort((a, b) => a.slot - b.slot);

        const shiftsForDay = (myShifts || [])
          .filter(s => s.shift_date === dateKey)
          .map(shift => {
            // Find colleagues in same facility on same date with overlapping shifts
            const facilityColleagues = colleagueShifts
              .filter(c => 
                c.facility_id === shift.facility_id && 
                (c as any).shift_date === dateKey
              )
              .map(c => {
                const firstName = c.profiles?.first_name || "";
                const lastName = c.profiles?.last_name || "";
                return `${firstName} ${lastName}`.trim() || "Unknown";
              })
              .filter(Boolean);

            return {
              id: shift.id,
              facilityName: (shift.facilities as any)?.name || null,
              shiftType: shift.shift_type,
              timeDisplay: getShiftTimeDisplay(
                shift.shift_type,
                shift.custom_start_time,
                shift.custom_end_time,
                openingHours || null
              ),
              isOnCall: shift.is_oncall,
              colleagues: facilityColleagues,
            };
          });

        return {
          date,
          dateKey,
          isClosed,
          onCallAssignments: dayOnCalls,
          shifts: shiftsForDay,
        };
      });

      setDayShifts(result);
    } catch (error) {
      console.error("Error fetching shifts:", error);
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  const getShiftTypeBadge = (shiftType: string) => {
    switch (shiftType) {
      case "am":
        return (
          <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">
            <Sun className="h-3 w-3 mr-1" />
            AM
          </Badge>
        );
      case "pm":
        return (
          <Badge variant="outline" className="bg-indigo-100 text-indigo-700 border-indigo-300">
            <Moon className="h-3 w-3 mr-1" />
            PM
          </Badge>
        );
      case "full_day":
        return (
          <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-300">
            Full Day
          </Badge>
        );
      case "custom":
        return (
          <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300">
            <Clock className="h-3 w-3 mr-1" />
            Custom
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Card className="mb-6 animate-fade-in">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          My Upcoming Shifts
        </CardTitle>
        <WeekSelector weekStart={weekStart} onWeekChange={setWeekStart} />
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !rotaExists ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">Rota not set yet</h3>
            <p className="text-sm text-muted-foreground/80 mt-1">
              The schedule for this week hasn't been created yet.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {dayShifts.map((day) => (
              <div
                key={day.dateKey}
                className={`flex items-start gap-4 p-3 rounded-lg border ${
                  day.isClosed ? "bg-muted/50 border-muted" : "bg-card border-border"
                }`}
              >
                {/* Day label */}
                <div className="w-28 flex-shrink-0">
                  <span className={`text-sm font-medium ${day.isClosed ? "text-muted-foreground" : ""}`}>
                    {formatDayDisplay(day.date)}
                  </span>
                </div>

                {/* Shift content */}
                <div className="flex-1">
                  {day.isClosed ? (
                    <Badge variant="secondary" className="bg-muted text-muted-foreground">
                      Closed
                    </Badge>
                  ) : day.shifts.length === 0 && day.onCallAssignments.length === 0 ? (
                    <span className="text-sm text-muted-foreground italic">Not working</span>
                  ) : (
                    <div className="flex items-start justify-between gap-4">
                      {/* Left side: Shifts */}
                      <div className="flex-1 space-y-2">
                        {day.shifts.length === 0 ? (
                          <span className="text-sm text-muted-foreground italic">Not working</span>
                        ) : (
                          day.shifts.map((shift) => (
                            <div key={shift.id} className="flex flex-wrap items-center gap-2">
                              {/* On-Call badge - show prominently first */}
                              {shift.isOnCall && (
                                <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
                                  <Phone className="h-3 w-3 mr-1" />
                                  On-Call
                                </Badge>
                              )}
                              {/* Facility/Room name if assigned */}
                              {shift.facilityName && (
                                <div className="flex items-center gap-1 text-sm">
                                  <DoorOpen className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">{shift.facilityName}</span>
                                </div>
                              )}
                              {/* Shift type badge - only show if has facility or not on-call-only */}
                              {(shift.facilityName || !shift.isOnCall) && getShiftTypeBadge(shift.shiftType)}
                              {/* Time display - only show if has facility or not on-call-only */}
                              {(shift.facilityName || !shift.isOnCall) && (
                                <span className="text-xs text-muted-foreground">
                                  {shift.timeDisplay}
                                </span>
                              )}
                              {/* Colleagues in same room */}
                              {shift.colleagues.length > 0 && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground ml-2">
                                  <Users className="h-3 w-3" />
                                  <span>Also working: {shift.colleagues.join(", ")}</span>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                      
                      {/* Right side: On-Call badges aligned to right border */}
                      {day.onCallAssignments.length > 0 && (
                        <div className="flex flex-col gap-1 items-end shrink-0">
                          {day.onCallAssignments.map((oc) => (
                            <Badge key={`oncall-${oc.slot}`} variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
                              <Phone className="h-3 w-3 mr-1" />
                              {oc.slotLabel}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};