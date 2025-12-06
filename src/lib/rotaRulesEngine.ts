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
  user_id: string;
  shift_date: string;
  shift_type: string;
  is_oncall: boolean;
  facility_id: string | null;
  is_temp_staff: boolean;
  temp_confirmed: boolean;
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
  requireOnCall: boolean
): RuleViolation[] {
  const results: RuleViolation[] = [];
  const dateKey = formatDateKey(date);
  const dayLabel = format(date, "EEEE do");

  // If site is closed, no violations
  if (openingHours?.is_closed) {
    return results;
  }

  const dayShifts = shifts.filter((s) => s.shift_date === dateKey);

  // Rule 1: No on-call chosen
  if (requireOnCall) {
    const hasOnCall = dayShifts.some((s) => s.is_oncall);
    if (!hasOnCall) {
      results.push({
        type: "no_oncall",
        severity: "error",
        day: dayLabel,
        dateKey,
        message: `No on-call assigned for ${dayLabel}`,
      });
    }
  }

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
    const staffMember = allStaff.find((s) => s.id === shift.user_id);
    const staffName = staffMember
      ? `${staffMember.first_name || ""} ${staffMember.last_name || ""}`.trim()
      : "Unknown";

    // Cross-site staff
    if (staffMember?.primary_site_id && staffMember.primary_site_id !== currentSiteId) {
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
        userId: shift.user_id,
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
        userId: shift.user_id,
        message: `Temp not confirmed: ${staffName}`,
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
  requireOnCall: boolean
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
      requireOnCall
    );

    results.push(...dayViolations);
  });

  return results;
}
