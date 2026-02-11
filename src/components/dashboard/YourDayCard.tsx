import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, DoorOpen, Clock, CheckCircle, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { format, startOfWeek } from "date-fns";
import { TaskWithDueDate } from "@/lib/taskUtils";

interface OnCallInfo {
  slot: number;
  name: string;
  phone: string | null;
  email: string;
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
  const [onCallList, setOnCallList] = useState<OnCallInfo[]>([]);
  const [shift, setShift] = useState<ShiftInfo | null>(null);
  const today = new Date();

  useEffect(() => {
    const fetchTodayData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("primary_site_id, organisation_id")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!profile?.primary_site_id || !profile?.organisation_id) {
        setLoading(false);
        return;
      }

      const todayStr = format(today, "yyyy-MM-dd");
      const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");

      // Fetch on-calls from organization-wide rota_oncalls table
      const { data: onCallShifts } = await supabase
        .from("rota_oncalls")
        .select(`
          user_id,
          temp_staff_name,
          is_temp_staff,
          oncall_slot,
          profiles(first_name, last_name, phone, email)
        `)
        .eq("organisation_id", profile.organisation_id)
        .eq("oncall_date", todayStr)
        .order("oncall_slot");

      if (onCallShifts && onCallShifts.length > 0) {
        const onCallInfoList: OnCallInfo[] = onCallShifts.map((shift) => {
          if (shift.is_temp_staff && shift.temp_staff_name) {
            return {
              slot: shift.oncall_slot || 1,
              name: shift.temp_staff_name,
              phone: null,
              email: "-"
            };
          } else if (shift.profiles) {
            const p = shift.profiles as any;
            return {
              slot: shift.oncall_slot || 1,
              name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Unknown",
              phone: p.phone,
              email: p.email
            };
          }
          return {
            slot: shift.oncall_slot || 1,
            name: "Unknown",
            phone: null,
            email: "-"
          };
        });
        setOnCallList(onCallInfoList);
      }

      // Fetch rota week for user's shift
      const { data: rotaWeek } = await supabase
        .from("rota_weeks")
        .select("id")
        .eq("site_id", profile.primary_site_id)
        .eq("week_start", weekStart)
        .maybeSingle();

      if (rotaWeek) {

        // Fetch user's shift for today
        const { data: userShifts } = await supabase
          .from("rota_shifts")
          .select(`
            shift_type,
            custom_start_time,
            custom_end_time,
            facility_id,
            facilities(name)
          `)
          .eq("rota_week_id", rotaWeek.id)
          .eq("shift_date", todayStr)
          .eq("user_id", session.user.id)
          .eq("is_oncall", false);

        if (userShifts && userShifts.length > 0) {
          // Get site opening hours for time display
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

          setShift({
            roomName: facility?.name || null,
            startTime,
            endTime,
            shiftType
          });
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6 animate-fade-in card-gradient">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">Your Day</CardTitle>
        <span className="text-sm text-muted-foreground">
          Today: {format(today, "EEE do MMM")}
        </span>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* On-Call Section */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Phone className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">On-Call</span>
            </div>
            {onCallList.length > 0 ? (
              <div className="space-y-1.5">
                {onCallList.map((oc) => {
                  const slotLabel = oc.slot === 1 ? "Manager" : oc.slot === 2 ? "Doctor 1" : "Doctor 2";
                  return (
                    <p key={oc.slot} className="text-sm">
                      <span className="text-muted-foreground">{slotLabel}:</span>{" "}
                      <span className="font-medium">{oc.name}</span>
                    </p>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No on-call assigned</p>
            )}
          </div>

          {/* Your Room Section */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex items-center gap-2 mb-3">
              <DoorOpen className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Your Room</span>
            </div>
            {shift?.roomName ? (
              <p className="font-medium">{shift.roomName}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Not scheduled</p>
            )}
          </div>

          {/* Your Shift Section */}
          <div className="rounded-lg border bg-muted/30 p-4">
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
              <p className="text-sm text-muted-foreground">Not working today</p>
            )}
          </div>

          {/* Due Tasks Section */}
          <div className="rounded-lg border bg-muted/30 p-4">
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
              <p className="text-sm text-muted-foreground">You don't have any tasks due today</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
