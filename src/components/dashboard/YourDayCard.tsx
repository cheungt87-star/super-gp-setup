import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { format, startOfWeek } from "date-fns";
import { TaskWithDueDate } from "@/lib/taskUtils";
import { usePatientCapacity } from "@/hooks/usePatientCapacity";
import { PatientCapacityCard } from "./PatientCapacityCard";

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
  const [primarySiteId, setPrimarySiteId] = useState<string | null>(null);
  const today = new Date();
  const capacity = usePatientCapacity(primarySiteId);

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
      setPrimarySiteId(profile.primary_site_id);

      const todayStr = format(today, "yyyy-MM-dd");
      const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");

      const { data: onCallShifts } = await supabase
        .from("rota_oncalls")
        .select(`
          user_id, temp_staff_name, is_temp_staff, oncall_slot, shift_period,
          profiles(first_name, last_name, phone, phone_ext, email)
        `)
        .eq("organisation_id", profile.organisation_id)
        .eq("oncall_date", todayStr)
        .order("oncall_slot");

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
      <div className="mb-8 rounded-2xl bg-[#F8FAFC] p-6">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-8 w-36 rounded-full" />
        </div>
        <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-32 rounded-3xl" />
          ))}
        </div>
      </div>
    );
  }

  const slotLabels: Record<number, string> = {
    1: "On-Call Manager",
    2: "On-Duty Doctor 1",
    3: "On-Duty Doctor 2",
  };

  const emptySlot: OnCallSlotInfo = { amName: null, amPhoneExt: null, pmName: null, pmPhoneExt: null };

  const renderNameWithExt = (name: string | null, ext: string | null) => {
    if (!name) return <span className="text-sm italic text-slate-400">Not assigned</span>;
    return (
      <span className="text-lg font-semibold text-[#0F172A]">
        {name}
        <span className="ml-2 text-sm font-bold text-[#2563EB]">• Ext {ext || "—"}</span>
      </span>
    );
  };

  const renderAmPmCard = (slotNum: number) => {
    const info = slots[slotNum] || emptySlot;
    return (
      <div key={slotNum} className="rounded-3xl bg-white p-6 shadow-[0_2px_20px_-4px_rgba(0,0,0,0.08)] flex flex-col">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">
          {slotLabels[slotNum]}
        </p>
        <div className="space-y-3 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">AM</span>
            {renderNameWithExt(info.amName, info.amPhoneExt)}
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">PM</span>
            {renderNameWithExt(info.pmName, info.pmPhoneExt)}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="mb-8 rounded-2xl bg-[#F8FAFC] p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-[#1E293B]">Your Day</h2>
        <span className="rounded-full bg-[#6366F1] px-4 py-1.5 text-sm font-semibold text-white">
          {format(today, "EEE do MMM")}
        </span>
      </div>

      {/* 3x2 Grid */}
      <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {/* Top Row: On-Call Slots */}
        {[1, 2, 3].map(renderAmPmCard)}

        {/* Your Room */}
        <div className="rounded-3xl bg-white p-6 shadow-[0_2px_20px_-4px_rgba(0,0,0,0.08)] flex flex-col">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">Your Room</p>
          {shift?.roomName ? (
            <p className="text-lg font-semibold text-[#0F172A]">{shift.roomName}</p>
          ) : (
            <p className="text-sm italic text-slate-400">Not scheduled</p>
          )}
        </div>

        {/* Your Shift */}
        <div className="rounded-3xl bg-white p-6 shadow-[0_2px_20px_-4px_rgba(0,0,0,0.08)] flex flex-col">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">Your Shift</p>
          {shift ? (
            <div>
              <p className="text-lg font-semibold text-[#0F172A]">
                {shift.startTime && shift.endTime ? `${shift.startTime} – ${shift.endTime}` : "Times not set"}
              </p>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mt-1">{shift.shiftType}</p>
            </div>
          ) : (
            <p className="text-sm italic text-slate-400">Not working today</p>
          )}
        </div>

        {/* Due Tasks */}
        <div className="rounded-3xl bg-white p-6 shadow-[0_2px_20px_-4px_rgba(0,0,0,0.08)] flex flex-col">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">Due Tasks</p>
          {todayTasks.length > 0 ? (
            <div>
              <p className="text-lg font-bold text-[#F43F5E] mb-2">{todayTasks.length} task{todayTasks.length !== 1 ? "s" : ""} due</p>
              <ul className="space-y-1">
                {todayTasks.slice(0, 3).map((task) => (
                  <li key={task.id} className="text-sm text-[#0F172A] flex items-start gap-1.5">
                    <span className="text-slate-400">•</span>
                    <span className="line-clamp-1">{task.name}</span>
                  </li>
                ))}
                {todayTasks.length > 3 && (
                  <li className="text-sm text-slate-500">+{todayTasks.length - 3} more</li>
                )}
              </ul>
            </div>
          ) : (
            <p className="text-sm italic text-slate-400">No tasks due today</p>
          )}
        </div>
        {/* Patient Capacity */}
        <PatientCapacityCard
          totalCapacity={capacity.totalCapacity}
          amCapacity={capacity.amCapacity}
          pmCapacity={capacity.pmCapacity}
          loading={capacity.loading}
        />
      </div>
    </div>
  );
}
