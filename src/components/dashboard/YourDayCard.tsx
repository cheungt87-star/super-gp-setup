import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, DoorOpen, Clock, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { format, startOfWeek } from "date-fns";
import { TaskWithDueDate } from "@/lib/taskUtils";

interface OnCallSlotInfo {
  amName: string | null;
  amPhoneExt: string | null;
  pmName: string | null;
  pmPhoneExt: string | null;
}

interface ShiftInfo {
  roomName: string | null;
  startTime: string | null;
  endTime: string | null;
  shiftType: string;
}

interface YourDayCardProps {
  todayTasks: TaskWithDueDate[];
}

export function YourDayCard({ todayTasks }: YourDayCardProps) {
  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState<Record<number, OnCallSlotInfo>>({});
  const [shift, setShift] = useState<ShiftInfo | null>(null);
  const today = new Date();

  useEffect(() => {
    const fetchTodayData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("primary_site_id, organisation_id")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!profile?.primary_site_id || !profile?.organisation_id) { setLoading(false); return; }

      const todayStr = format(today, "yyyy-MM-dd");
      const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");

      // Fetch on-calls
      const { data: onCallShifts } = await supabase
        .from("rota_oncalls")
        .select(`
          user_id, temp_staff_name, is_temp_staff, oncall_slot, shift_period,
          profiles(first_name, last_name, phone, phone_ext, email)
        `)
        .eq("organisation_id", profile.organisation_id)
        .eq("oncall_date", todayStr)
        .order("oncall_slot");

      // Build slot map with AM/PM split
      const slotMap: Record<number, OnCallSlotInfo> = {
        1: { amName: null, amPhoneExt: null, pmName: null, pmPhoneExt: null },
        2: { amName: null, amPhoneExt: null, pmName: null, pmPhoneExt: null },
        3: { amName: null, amPhoneExt: null, pmName: null, pmPhoneExt: null },
      };

      if (onCallShifts) {
        for (const oc of onCallShifts) {
          const slot = oc.oncall_slot || 1;
          if (!slotMap[slot]) continue;

          let name: string;
          let phoneExt: string | null = null;

          if (oc.is_temp_staff && oc.temp_staff_name) {
            name = oc.temp_staff_name;
          } else if (oc.profiles) {
            const p = oc.profiles as any;
            name = `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Unknown";
            phoneExt = p.phone_ext || null;
          } else {
            name = "Unknown";
          }

          const period = oc.shift_period || "full_day";
          if (period === "am" || period === "full_day") {
            slotMap[slot].amName = name;
            slotMap[slot].amPhoneExt = phoneExt;
          }
          if (period === "pm" || period === "full_day") {
            slotMap[slot].pmName = name;
            slotMap[slot].pmPhoneExt = phoneExt;
          }
        }
      }
      setSlots(slotMap);

      // Fetch shift (existing logic)
      const { data: rotaWeek } = await supabase
        .from("rota_weeks")
        .select("id")
        .eq("site_id", profile.primary_site_id)
        .eq("week_start", weekStart)
        .maybeSingle();

      if (rotaWeek) {
        const { data: userShifts } = await supabase
          .from("rota_shifts")
          .select(`shift_type, custom_start_time, custom_end_time, facility_id, facilities(name)`)
          .eq("rota_week_id", rotaWeek.id)
          .eq("shift_date", todayStr)
          .eq("user_id", session.user.id)
          .eq("is_oncall", false);

        if (userShifts && userShifts.length > 0) {
          const dayOfWeek = today.getDay() === 0 ? 6 : today.getDay() - 1;
          const { data: openingHours } = await supabase
            .from("site_opening_hours")
            .select("am_open_time, am_close_time, pm_open_time, pm_close_time")
            .eq("site_id", profile.primary_site_id)
            .eq("day_of_week", dayOfWeek)
            .maybeSingle();

          const firstShift = userShifts[0];
          const facility = firstShift.facilities as any;
          let startTime: string | null = null;
          let endTime: string | null = null;
          let shiftType = "Shift";

          if (firstShift.shift_type === "custom") {
            startTime = firstShift.custom_start_time?.slice(0, 5) || null;
            endTime = firstShift.custom_end_time?.slice(0, 5) || null;
            shiftType = "Custom";
          } else if (openingHours) {
            if (firstShift.shift_type === "am") {
              startTime = openingHours.am_open_time?.slice(0, 5) || null;
              endTime = openingHours.am_close_time?.slice(0, 5) || null;
              shiftType = "AM";
            } else if (firstShift.shift_type === "pm") {
              startTime = openingHours.pm_open_time?.slice(0, 5) || null;
              endTime = openingHours.pm_close_time?.slice(0, 5) || null;
              shiftType = "PM";
            } else if (firstShift.shift_type === "full_day") {
              startTime = openingHours.am_open_time?.slice(0, 5) || null;
              endTime = openingHours.pm_close_time?.slice(0, 5) || null;
              shiftType = "Full Day";
            }
          }

          setShift({ roomName: facility?.name || null, startTime, endTime, shiftType });
        }
      }

      setLoading(false);
    };

    fetchTodayData();
  }, []);

  if (loading) {
    return (
      <Card className="mb-6 animate-fade-in">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-5 w-28" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const slotLabels: Record<number, string> = { 1: "On-Call Manager", 2: "On-Duty Doctor 1", 3: "On-Duty Doctor 2" };

  const renderAmPm = (info: OnCallSlotInfo) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground font-medium">AM</span>
        {info.amName ? (
          <span className="font-medium text-right">
            {info.amName} <span className="text-muted-foreground ml-1">EXT {info.amPhoneExt || "—"}</span>
          </span>
        ) : (
          <span className="text-muted-foreground italic">Not assigned</span>
        )}
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground font-medium">PM</span>
        {info.pmName ? (
          <span className="font-medium text-right">
            {info.pmName} <span className="text-muted-foreground ml-1">EXT {info.pmPhoneExt || "—"}</span>
          </span>
        ) : (
          <span className="text-muted-foreground italic">Not assigned</span>
        )}
      </div>
    </div>
  );

  return (
    <Card className="mb-6 animate-fade-in card-gradient">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">Your Day</CardTitle>
        <span className="text-sm text-muted-foreground">
          Today: {format(today, "EEE do MMM")}
        </span>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {/* Top Row: On-Call Slots */}
          {[1, 2, 3].map((slotNum) => (
            <div key={slotNum} className="rounded-lg border bg-muted/30 p-4 flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <Phone className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  {slotLabels[slotNum]}
                </span>
              </div>
              {renderAmPm(slots[slotNum] || { amName: null, amPhoneExt: null, pmName: null, pmPhoneExt: null })}
            </div>
          ))}

          {/* Bottom Row */}
          {/* Your Room */}
          <div className="rounded-lg border bg-muted/30 p-4 flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <DoorOpen className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Your Room</span>
            </div>
            {shift?.roomName ? (
              <p className="font-medium">{shift.roomName}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">Not scheduled</p>
            )}
          </div>

          {/* Your Shift */}
          <div className="rounded-lg border bg-muted/30 p-4 flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Your Shift</span>
            </div>
            {shift ? (
              <div>
                <p className="font-medium">
                  {shift.startTime && shift.endTime
                    ? `${shift.startTime} - ${shift.endTime}`
                    : "Times not set"}
                </p>
                <p className="text-sm text-muted-foreground">({shift.shiftType})</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">Not working today</p>
            )}
          </div>

          {/* Due Tasks */}
          <div className="rounded-lg border bg-muted/30 p-4 flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Due Tasks</span>
            </div>
            {todayTasks.length > 0 ? (
              <ul className="space-y-1">
                {todayTasks.slice(0, 3).map((task) => (
                  <li key={task.id} className="text-sm flex items-start gap-1">
                    <span className="text-muted-foreground">•</span>
                    <span className="line-clamp-1">{task.name}</span>
                  </li>
                ))}
                {todayTasks.length > 3 && (
                  <li className="text-sm text-muted-foreground">
                    +{todayTasks.length - 3} more
                  </li>
                )}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground italic">No tasks due today</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
