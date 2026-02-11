import { formatDateKey } from "./rotaUtils";
import { format } from "date-fns";

export interface RuleViolation {
  type: "no_oncall" | "empty_room" | "cross_site" | "temp_not_confirmed";
  severity: "error" | "warning";
  day: string;
  dateKey: string;
  room?: string;
  roomId?: string;
  slot?: string;
  staffName?: string;
  userId?: string;
  message: string;
}

interface OncallRecord {
  oncall_slot: number;
  oncall_date: string;
  shift_period: string;
  user_id: string | null;
  temp_staff_name: string | null;
}

interface ClinicRoom {
  id: string;
  name: string;
}

interface StaffMember {
  id: string;
  first_name: string | null;
  last_name: string | null;
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

interface Shift {
  id: string;
  user_id: string | null;
  shift_date: string;
  shift_type: string;
  is_oncall: boolean;
  facility_id: string | null;
  is_temp_staff: boolean;
  temp_confirmed: boolean;
  temp_staff_name?: string | null;
  user_name?: string;
}

/**
 * Validate a single day's shifts against rota rules
 */
export function validateDay(
  date: Date,
  shifts: Shift[],
  clinicRooms: ClinicRoom[],
  openingHours: OpeningHour | undefined,
  allStaff: StaffMember[],
  currentSiteId: string,
  requireOnCall: boolean,
  oncalls?: OncallRecord[]
): RuleViolation[] {
  const results: RuleViolation[] = [];
  const dateKey = formatDateKey(date);
  const dayLabel = format(date, "EEEE do");

  // If site is closed, no violations
  if (openingHours?.is_closed) {
    return results;
  }

  const dayShifts = shifts.filter((s) => s.shift_date === dateKey);

  // Rule 1: Check all on-call slots are assigned (using oncalls table data)
  const dayOncalls = oncalls?.filter((o) => o.oncall_date === dateKey) || [];
  [1, 2, 3].forEach((slot) => {
    const hasOncallForSlot = dayOncalls.some((o) => o.oncall_slot === slot && (o.user_id || o.temp_staff_name));
    if (!hasOncallForSlot) {
      const slotLabel = slot === 1 ? "On Call" : `On Call ${slot}`;
      results.push({
        type: "no_oncall",
        severity: slot === 1 ? "error" : "warning",
        day: dayLabel,
        dateKey,
        message: `${slotLabel} not assigned for ${dayLabel}`,
      });
    }
  });

  // Rule 2: Rooms left empty (check AM and PM coverage)
  clinicRooms.forEach((room) => {
    const roomShifts = dayShifts.filter((s) => s.facility_id === room.id && !s.is_oncall);
    const hasAM = roomShifts.some((s) => s.shift_type === "am" || s.shift_type === "full_day");
    const hasPM = roomShifts.some((s) => s.shift_type === "pm" || s.shift_type === "full_day");

    if (!hasAM) {
      results.push({
        type: "empty_room",
        severity: "warning",
        day: dayLabel,
        dateKey,
        room: room.name,
        roomId: room.id,
        slot: "AM",
        message: `${room.name} is empty for AM on ${dayLabel}`,
      });
    }
    if (!hasPM) {
      results.push({
        type: "empty_room",
        severity: "warning",
        day: dayLabel,
        dateKey,
        room: room.name,
        roomId: room.id,
        slot: "PM",
        message: `${room.name} is empty for PM on ${dayLabel}`,
      });
    }
  });

  // Rule 3 & 4: Check each shift for cross-site staff and unconfirmed temps
  dayShifts.forEach((shift) => {
    // Handle external temp staff (no user_id)
    const isExternalTemp = shift.is_temp_staff && !shift.user_id;
    
    let staffName: string;
    let staffMember: StaffMember | undefined;
    
    if (isExternalTemp) {
      staffName = shift.temp_staff_name || shift.user_name || "External Temp";
    } else {
      staffMember = allStaff.find((s) => s.id === shift.user_id);
      staffName = staffMember
        ? `${staffMember.first_name || ""} ${staffMember.last_name || ""}`.trim()
        : shift.user_name || "Unknown";
    }

    // Cross-site staff (skip for external temps - they don't have a primary site)
    if (!isExternalTemp && staffMember?.primary_site_id && staffMember.primary_site_id !== currentSiteId) {
      const room = clinicRooms.find((r) => r.id === shift.facility_id);
      results.push({
        type: "cross_site",
        severity: "warning",
        day: dayLabel,
        dateKey,
        room: room?.name,
        roomId: room?.id,
        slot: shift.shift_type.toUpperCase(),
        staffName,
        userId: shift.user_id || undefined,
        message: `${staffName} is from another site`,
      });
    }

    // Unconfirmed temp staff
    if (shift.is_temp_staff && !shift.temp_confirmed) {
      const room = clinicRooms.find((r) => r.id === shift.facility_id);
      results.push({
        type: "temp_not_confirmed",
        severity: "error",
        day: dayLabel,
        dateKey,
        room: room?.name,
        roomId: room?.id,
        slot: shift.shift_type === "full_day" ? "Full Day" : shift.shift_type.toUpperCase(),
        staffName,
        userId: shift.user_id || undefined,
        message: `Temp not confirmed: ${staffName}${isExternalTemp ? " (External)" : ""}`,
      });
    }
  });

  return results;
}

/**
 * Validate all days in a week
 */
export function validateWeek(
  weekDays: Date[],
  shifts: Shift[],
  clinicRooms: ClinicRoom[],
  openingHoursByDay: Record<number, OpeningHour>,
  allStaff: StaffMember[],
  currentSiteId: string,
  requireOnCall: boolean,
  oncalls?: OncallRecord[]
): RuleViolation[] {
  const results: RuleViolation[] = [];

  weekDays.forEach((day) => {
    const dayOfWeek = day.getDay();
    const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const dayHours = openingHoursByDay[adjustedDay];

    const dayViolations = validateDay(
      day,
      shifts,
      clinicRooms,
      dayHours,
      allStaff,
      currentSiteId,
      requireOnCall,
      oncalls
    );

    results.push(...dayViolations);
  });

  return results;
}
