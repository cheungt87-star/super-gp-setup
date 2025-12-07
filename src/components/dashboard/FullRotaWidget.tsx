import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronLeft, ChevronRight, Calendar, Phone, DoorOpen, Clock } from "lucide-react";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";
import { getJobTitleColors } from "@/lib/jobTitleColors";

interface Site {
  id: string;
  name: string;
}

interface OpeningHours {
  day_of_week: number;
  is_closed: boolean;
  am_open_time: string | null;
  am_close_time: string | null;
  pm_open_time: string | null;
  pm_close_time: string | null;
}

interface ShiftData {
  id: string;
  shift_date: string;
  shift_type: string;
  is_oncall: boolean;
  is_temp_staff: boolean;
  temp_confirmed: boolean;
  temp_staff_name: string | null;
  custom_start_time: string | null;
  custom_end_time: string | null;
  facility_id: string | null;
  user_id: string | null;
  facility_name: string | null;
  staff_name: string | null;
  job_title_name: string | null;
}

interface DaySchedule {
  date: Date;
  dateKey: string;
  dayOfWeek: number;
  isClosed: boolean;
  openingHours: OpeningHours | null;
  onCallShifts: ShiftData[];
  roomShifts: Map<string, { am: ShiftData[]; pm: ShiftData[]; fullDay: ShiftData[]; custom: ShiftData[] }>;
}

export function FullRotaWidget() {
  const [loading, setLoading] = useState(true);
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [schedule, setSchedule] = useState<DaySchedule[]>([]);
  const [facilities, setFacilities] = useState<Map<string, string>>(new Map());
  const [rotaExists, setRotaExists] = useState(true);

  // Fetch sites on mount
  useEffect(() => {
    const fetchSites = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("organisation_id, primary_site_id")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!profile?.organisation_id) return;

      const { data: sitesData } = await supabase
        .from("sites")
        .select("id, name")
        .eq("organisation_id", profile.organisation_id)
        .eq("is_active", true)
        .order("name");

      if (sitesData && sitesData.length > 0) {
        setSites(sitesData);
        // Default to user's primary site if available, otherwise first site
        const defaultSite = profile.primary_site_id && sitesData.find(s => s.id === profile.primary_site_id)
          ? profile.primary_site_id
          : sitesData[0].id;
        setSelectedSiteId(defaultSite);
      }
      setLoading(false);
    };

    fetchSites();
  }, []);

  // Fetch schedule when site or week changes
  const fetchSchedule = useCallback(async () => {
    if (!selectedSiteId) return;

    setLoading(true);

    try {
      // Get facilities for this site
      const { data: facilitiesData } = await supabase
        .from("facilities")
        .select("id, name")
        .eq("site_id", selectedSiteId)
        .eq("facility_type", "clinic_room")
        .eq("is_active", true)
        .order("name");

      const facilityMap = new Map<string, string>();
      (facilitiesData || []).forEach(f => facilityMap.set(f.id, f.name));
      setFacilities(facilityMap);

      // Get opening hours
      const { data: hoursData } = await supabase
        .from("site_opening_hours")
        .select("*")
        .eq("site_id", selectedSiteId);

      const hoursMap = new Map<number, OpeningHours>();
      (hoursData || []).forEach(h => hoursMap.set(h.day_of_week, h));

      // Get rota week
      const weekStartStr = format(weekStart, "yyyy-MM-dd");
      const { data: rotaWeek } = await supabase
        .from("rota_weeks")
        .select("id")
        .eq("site_id", selectedSiteId)
        .eq("week_start", weekStartStr)
        .maybeSingle();

      if (!rotaWeek) {
        setRotaExists(false);
        // Still build empty schedule structure
        const emptySchedule: DaySchedule[] = [];
        for (let i = 0; i < 7; i++) {
          const date = addDays(weekStart, i);
          const dayOfWeek = i;
          const hours = hoursMap.get(dayOfWeek) || null;
          emptySchedule.push({
            date,
            dateKey: format(date, "yyyy-MM-dd"),
            dayOfWeek,
            isClosed: hours?.is_closed ?? true,
            openingHours: hours,
            onCallShifts: [],
            roomShifts: new Map()
          });
        }
        setSchedule(emptySchedule);
        setLoading(false);
        return;
      }

      setRotaExists(true);

      // Get shifts with user details
      const { data: shiftsData } = await supabase
        .from("rota_shifts")
        .select(`
          id,
          shift_date,
          shift_type,
          is_oncall,
          is_temp_staff,
          temp_confirmed,
          temp_staff_name,
          custom_start_time,
          custom_end_time,
          facility_id,
          user_id,
          profiles(first_name, last_name, job_title_id, job_titles(name))
        `)
        .eq("rota_week_id", rotaWeek.id);

      // Build schedule structure
      const weekSchedule: DaySchedule[] = [];
      for (let i = 0; i < 7; i++) {
        const date = addDays(weekStart, i);
        const dateKey = format(date, "yyyy-MM-dd");
        const dayOfWeek = i;
        const hours = hoursMap.get(dayOfWeek) || null;

        const dayShifts = (shiftsData || []).filter(s => s.shift_date === dateKey);
        const onCallShifts: ShiftData[] = [];
        const roomShifts = new Map<string, { am: ShiftData[]; pm: ShiftData[]; fullDay: ShiftData[]; custom: ShiftData[] }>();

        // Initialize room slots
        facilityMap.forEach((name, id) => {
          roomShifts.set(id, { am: [], pm: [], fullDay: [], custom: [] });
        });

        dayShifts.forEach(shift => {
          const shiftData: ShiftData = {
            id: shift.id,
            shift_date: shift.shift_date,
            shift_type: shift.shift_type,
            is_oncall: shift.is_oncall,
            is_temp_staff: shift.is_temp_staff,
            temp_confirmed: shift.temp_confirmed,
            temp_staff_name: shift.temp_staff_name,
            custom_start_time: shift.custom_start_time,
            custom_end_time: shift.custom_end_time,
            facility_id: shift.facility_id,
            user_id: shift.user_id,
            facility_name: shift.facility_id ? facilityMap.get(shift.facility_id) || null : null,
            staff_name: shift.is_temp_staff && !shift.user_id
              ? shift.temp_staff_name
              : shift.profiles
                ? `${shift.profiles.first_name || ""} ${shift.profiles.last_name || ""}`.trim()
                : null,
            job_title_name: shift.profiles?.job_titles?.name || null
          };

          if (shift.is_oncall && !shift.facility_id) {
            onCallShifts.push(shiftData);
          } else if (shift.facility_id && roomShifts.has(shift.facility_id)) {
            const room = roomShifts.get(shift.facility_id)!;
            if (shift.custom_start_time || shift.custom_end_time) {
              room.custom.push(shiftData);
            } else if (shift.shift_type === "am") {
              room.am.push(shiftData);
            } else if (shift.shift_type === "pm") {
              room.pm.push(shiftData);
            } else {
              room.fullDay.push(shiftData);
            }
          }
        });

        weekSchedule.push({
          date,
          dateKey,
          dayOfWeek,
          isClosed: hours?.is_closed ?? true,
          openingHours: hours,
          onCallShifts,
          roomShifts
        });
      }

      setSchedule(weekSchedule);
    } catch (error) {
      console.error("Error fetching schedule:", error);
    }

    setLoading(false);
  }, [selectedSiteId, weekStart]);

  useEffect(() => {
    if (selectedSiteId) {
      fetchSchedule();
    }
  }, [selectedSiteId, weekStart, fetchSchedule]);

  const goToToday = () => {
    setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  const goToPreviousWeek = () => {
    setWeekStart(prev => addDays(prev, -7));
  };

  const goToNextWeek = () => {
    setWeekStart(prev => addDays(prev, 7));
  };

  const formatWeekRange = (start: Date): string => {
    const end = addDays(start, 6);
    const startMonth = format(start, "MMM");
    const endMonth = format(end, "MMM");
    const year = format(end, "yyyy");
    
    if (startMonth === endMonth) {
      return `${format(start, "d")} - ${format(end, "d")} ${endMonth} ${year}`;
    }
    return `${format(start, "d MMM")} - ${format(end, "d MMM")} ${year}`;
  };

  const getOrdinalSuffix = (day: number): string => {
    if (day > 3 && day < 21) return "th";
    switch (day % 10) {
      case 1: return "st";
      case 2: return "nd";
      case 3: return "rd";
      default: return "th";
    }
  };

  const formatDayHeader = (date: Date): string => {
    const day = date.getDate();
    return `${format(date, "EEE")} ${day}${getOrdinalSuffix(day)} ${format(date, "MMM")}`;
  };

  const renderShiftBadge = (shift: ShiftData) => {
    const isUnconfirmedTemp = shift.is_temp_staff && !shift.temp_confirmed;
    const isConfirmedTemp = shift.is_temp_staff && shift.temp_confirmed;

    return (
      <div 
        key={shift.id}
        className={`flex items-center gap-1.5 text-sm px-2 py-1 rounded ${
          isUnconfirmedTemp 
            ? "bg-red-100 text-red-800 border border-red-300" 
            : isConfirmedTemp
              ? "bg-amber-50 text-amber-800 border border-amber-200"
              : "bg-muted"
        }`}
      >
        {isUnconfirmedTemp && <span className="text-xs">⚠️</span>}
        <span className="font-medium">{shift.staff_name || "Unassigned"}</span>
        {shift.job_title_name && (
          <Badge variant="outline" className={`text-xs ${getJobTitleColors(shift.job_title_name)}`}>
            {shift.job_title_name}
          </Badge>
        )}
        {shift.custom_start_time && shift.custom_end_time && (
          <span className="text-xs text-muted-foreground">
            ({shift.custom_start_time.slice(0, 5)}-{shift.custom_end_time.slice(0, 5)})
          </span>
        )}
      </div>
    );
  };

  if (sites.length === 0 && !loading) {
    return null;
  }

  return (
    <Card className="mb-6 animate-fade-in">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Full Rota
          </CardTitle>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* Site Selector */}
            <Select value={selectedSiteId || ""} onValueChange={setSelectedSiteId}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select site" />
              </SelectTrigger>
              <SelectContent>
                {sites.map(site => (
                  <SelectItem key={site.id} value={site.id}>
                    {site.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Week Navigation */}
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" onClick={goToPreviousWeek}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" className="min-w-[160px]" onClick={goToToday}>
                {formatWeekRange(weekStart)}
              </Button>
              <Button variant="outline" size="icon" onClick={goToNextWeek}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !rotaExists ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Calendar className="h-10 w-10 mb-3 opacity-50" />
            <p className="text-sm">Rota not set up for this week yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {schedule.filter(day => !day.isClosed).map(day => (
              <div key={day.dateKey} className="border rounded-lg overflow-hidden">
                {/* Day Header */}
                <div className="bg-muted/50 px-4 py-2 border-b">
                  <h4 className="font-medium">{formatDayHeader(day.date)}</h4>
                </div>

                <div className="p-4 space-y-4">
                  {/* On-Call Section */}
                  {day.onCallShifts.length > 0 && (
                    <div className="flex items-start gap-3">
                      <div className="flex items-center gap-1.5 text-sm text-orange-700 font-medium min-w-[80px]">
                        <Phone className="h-4 w-4" />
                        On-Call
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {day.onCallShifts.map(shift => renderShiftBadge(shift))}
                      </div>
                    </div>
                  )}

                  {/* Rooms Section */}
                  {facilities.size > 0 ? (
                    <div className="space-y-3">
                      {Array.from(facilities.entries()).map(([roomId, roomName]) => {
                        const roomData = day.roomShifts.get(roomId);
                        if (!roomData) return null;
                        
                        const hasShifts = roomData.am.length > 0 || roomData.pm.length > 0 || 
                                         roomData.fullDay.length > 0 || roomData.custom.length > 0;

                        return (
                          <div key={roomId} className="flex items-start gap-3">
                            <div className="flex items-center gap-1.5 text-sm font-medium min-w-[80px] text-muted-foreground">
                              <DoorOpen className="h-4 w-4" />
                              {roomName}
                            </div>
                            <div className="flex-1">
                              {hasShifts ? (
                                <div className="space-y-2">
                                  {/* Full Day */}
                                  {roomData.fullDay.length > 0 && (
                                    <div className="flex items-center gap-2">
                                      <Badge variant="secondary" className="text-xs">Full Day</Badge>
                                      <div className="flex flex-wrap gap-2">
                                        {roomData.fullDay.map(shift => renderShiftBadge(shift))}
                                      </div>
                                    </div>
                                  )}
                                  {/* AM */}
                                  {roomData.am.length > 0 && (
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="text-xs bg-sky-50 text-sky-700 border-sky-200">AM</Badge>
                                      <div className="flex flex-wrap gap-2">
                                        {roomData.am.map(shift => renderShiftBadge(shift))}
                                      </div>
                                    </div>
                                  )}
                                  {/* PM */}
                                  {roomData.pm.length > 0 && (
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="text-xs bg-violet-50 text-violet-700 border-violet-200">PM</Badge>
                                      <div className="flex flex-wrap gap-2">
                                        {roomData.pm.map(shift => renderShiftBadge(shift))}
                                      </div>
                                    </div>
                                  )}
                                  {/* Custom */}
                                  {roomData.custom.length > 0 && (
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="text-xs">
                                        <Clock className="h-3 w-3 mr-1" />
                                        Custom
                                      </Badge>
                                      <div className="flex flex-wrap gap-2">
                                        {roomData.custom.map(shift => renderShiftBadge(shift))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground italic">No staff scheduled</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No clinic rooms configured</p>
                  )}

                  {/* Empty state when no on-call and no rooms have shifts */}
                  {day.onCallShifts.length === 0 && facilities.size === 0 && (
                    <p className="text-sm text-muted-foreground italic">No staff scheduled</p>
                  )}
                </div>
              </div>
            ))}

            {/* Show closed days summary */}
            {schedule.filter(day => day.isClosed).length > 0 && (
              <div className="text-sm text-muted-foreground text-center pt-2">
                Closed: {schedule.filter(day => day.isClosed).map(day => format(day.date, "EEE")).join(", ")}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
