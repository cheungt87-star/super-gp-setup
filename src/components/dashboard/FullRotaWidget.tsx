import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronLeft, ChevronRight, Calendar, Clock } from "lucide-react";
import { format, addDays, startOfWeek } from "date-fns";
import { getJobTitleColors } from "@/lib/jobTitleColors";
import { cn } from "@/lib/utils";

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
  oncall_slot: number | null;
  is_temp_staff: boolean;
  temp_confirmed: boolean;
  temp_staff_name: string | null;
  custom_start_time: string | null;
  custom_end_time: string | null;
  facility_id: string | null;
  user_id: string | null;
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
  roomShifts: Map<string, { am: ShiftData[]; pm: ShiftData[]; fullDay: ShiftData[] }>;
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

      // Get organization ID for on-calls
      const { data: profile } = await supabase
        .from("profiles")
        .select("organisation_id")
        .eq("primary_site_id", selectedSiteId)
        .limit(1)
        .maybeSingle();

      // Fetch on-calls from organization-wide table
      const weekDates = Array.from({ length: 7 }, (_, i) => format(addDays(weekStart, i), "yyyy-MM-dd"));
      const { data: oncallsData } = await supabase
        .from("rota_oncalls")
        .select(`
          oncall_date,
          oncall_slot,
          user_id,
          is_temp_staff,
          temp_confirmed,
          temp_staff_name,
          profiles(first_name, last_name, job_titles(name))
        `)
        .eq("organisation_id", profile?.organisation_id || "")
        .in("oncall_date", weekDates);

      // Get shifts with user details and job titles
      const { data: shiftsData } = await supabase
        .from("rota_shifts")
        .select(`
          id,
          shift_date,
          shift_type,
          is_temp_staff,
          temp_confirmed,
          temp_staff_name,
          custom_start_time,
          custom_end_time,
          facility_id,
          user_id,
          profiles(first_name, last_name, job_titles(name))
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
        const dayOncalls = (oncallsData || []).filter(oc => oc.oncall_date === dateKey);
        const onCallShifts: ShiftData[] = [];
        const roomShifts = new Map<string, { am: ShiftData[]; pm: ShiftData[]; fullDay: ShiftData[] }>();

        // Initialize room slots
        facilityMap.forEach((name, id) => {
          roomShifts.set(id, { am: [], pm: [], fullDay: [] });
        });

        // Process on-calls from rota_oncalls table
        dayOncalls.forEach(oc => {
          const profileData = oc.profiles as { first_name: string | null; last_name: string | null; job_titles: { name: string } | null } | null;
          onCallShifts.push({
            id: `oncall-${oc.oncall_date}-${oc.oncall_slot}`,
            shift_date: oc.oncall_date,
            shift_type: "full_day",
            is_oncall: true,
            oncall_slot: oc.oncall_slot,
            is_temp_staff: oc.is_temp_staff,
            temp_confirmed: oc.temp_confirmed,
            temp_staff_name: oc.temp_staff_name,
            custom_start_time: null,
            custom_end_time: null,
            facility_id: null,
            user_id: oc.user_id,
            staff_name: oc.is_temp_staff && !oc.user_id
              ? oc.temp_staff_name
              : profileData
                ? `${profileData.first_name || ""} ${profileData.last_name || ""}`.trim()
                : null,
            job_title_name: profileData?.job_titles?.name || null
          });
        });

        // Process room shifts
        dayShifts.forEach(shift => {
          const profileData = shift.profiles as { first_name: string | null; last_name: string | null; job_titles: { name: string } | null } | null;
          const shiftData: ShiftData = {
            id: shift.id,
            shift_date: shift.shift_date,
            shift_type: shift.shift_type,
            is_oncall: false,
            oncall_slot: null,
            is_temp_staff: shift.is_temp_staff,
            temp_confirmed: shift.temp_confirmed,
            temp_staff_name: shift.temp_staff_name,
            custom_start_time: shift.custom_start_time,
            custom_end_time: shift.custom_end_time,
            facility_id: shift.facility_id,
            user_id: shift.user_id,
            staff_name: shift.is_temp_staff && !shift.user_id
              ? shift.temp_staff_name
              : profileData
                ? `${profileData.first_name || ""} ${profileData.last_name || ""}`.trim()
                : null,
            job_title_name: profileData?.job_titles?.name || null
          };

          if (shift.facility_id && roomShifts.has(shift.facility_id)) {
            const room = roomShifts.get(shift.facility_id)!;
            if (shift.shift_type === "am") {
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

  // Get only open days for columns
  const openDays = schedule.filter(day => !day.isClosed);

  // Format staff name for display (handle temp staff styling + job title badge)
  const formatStaffName = (shift: ShiftData) => {
    const name = shift.staff_name || "-";
    const isUnconfirmedTemp = shift.is_temp_staff && !shift.temp_confirmed;
    
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className={isUnconfirmedTemp ? "text-destructive" : ""}>
          {isUnconfirmedTemp && "⚠️ "}{name}
        </span>
        {shift.job_title_name && (
          <span className={cn(
            "text-xs px-1.5 py-0.5 rounded-full border whitespace-nowrap",
            getJobTitleColors(shift.job_title_name)
          )}>
            {shift.job_title_name}
          </span>
        )}
      </div>
    );
  };

  // Get all staff for a room slot (AM, PM, or Full Day that covers that slot)
  const getRoomSlotStaff = (day: DaySchedule, roomId: string, slot: "am" | "pm") => {
    const roomData = day.roomShifts.get(roomId);
    if (!roomData) return [];
    
    const slotShifts = slot === "am" ? roomData.am : roomData.pm;
    const fullDayShifts = roomData.fullDay;
    
    return [...slotShifts, ...fullDayShifts];
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
        ) : openDays.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Calendar className="h-10 w-10 mb-3 opacity-50" />
            <p className="text-sm">No open days this week</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="text-left p-3 border border-border bg-muted/30 font-medium min-w-[120px]">
                    Room
                  </th>
                  {openDays.map(day => (
                    <th 
                      key={day.dateKey} 
                      className="text-center p-3 border border-border bg-muted/30 font-medium min-w-[100px]"
                    >
                      {format(day.date, "EEE d")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* On-Call Rows - 3 slots */}
                {[1, 2, 3].map((slot) => (
                  <tr key={`oncall-${slot}`} className="bg-muted/10">
                    <td className="p-3 border border-border">
                      <div className="flex items-center gap-2 font-medium">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {slot === 1 ? "On Call Manager" : slot === 2 ? "On Duty Doctor 1" : "On Duty Doctor 2"}
                        </span>
                      </div>
                    </td>
                    {openDays.map(day => {
                      const slotShifts = day.onCallShifts.filter(s => (s as any).oncall_slot === slot || (!s.hasOwnProperty('oncall_slot') && slot === 1));
                      return (
                        <td key={day.dateKey} className="p-3 border border-border text-center">
                          <span className="text-green-700">
                            {slotShifts.length > 0 
                              ? slotShifts.map((s, i) => <div key={s.id}>{formatStaffName(s)}</div>)
                              : "-"}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {/* Room Rows */}
                {Array.from(facilities.entries()).map(([roomId, roomName]) => (
                  <tr key={roomId}>
                    <td className="p-3 border border-border font-medium align-top">
                      {roomName}
                    </td>
                    {openDays.map(day => {
                      const amStaff = getRoomSlotStaff(day, roomId, "am");
                      const pmStaff = getRoomSlotStaff(day, roomId, "pm");
                      
                      return (
                        <td key={day.dateKey} className="p-3 border border-border align-top">
                          <div className="space-y-2">
                            {/* AM Section */}
                            <div>
                              <span className="text-green-700 font-medium">AM:</span>
                              <div className="text-green-700">
                                {amStaff.length > 0 
                                  ? amStaff.map((s, i) => (
                                      <div key={s.id}>{formatStaffName(s)}</div>
                                    ))
                                  : "-"}
                              </div>
                            </div>
                            {/* PM Section */}
                            <div>
                              <span className="text-green-700 font-medium">PM:</span>
                              <div className="text-green-700">
                                {pmStaff.length > 0 
                                  ? pmStaff.map((s, i) => (
                                      <div key={s.id}>{formatStaffName(s)}</div>
                                    ))
                                  : "-"}
                              </div>
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {/* Empty state for no rooms */}
                {facilities.size === 0 && (
                  <tr>
                    <td 
                      colSpan={openDays.length + 1} 
                      className="p-6 border border-border text-center text-muted-foreground"
                    >
                      No clinic rooms configured for this site
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
