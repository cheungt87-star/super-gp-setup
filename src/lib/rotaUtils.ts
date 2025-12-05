import { startOfWeek, addDays, format, parseISO, differenceInMinutes } from "date-fns";

export const getWeekDays = (weekStart: Date): Date[] => {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
};

export const getWeekStartDate = (date: Date): Date => {
  return startOfWeek(date, { weekStartsOn: 1 }); // Monday
};

export const formatWeekRange = (weekStart: Date): string => {
  const weekEnd = addDays(weekStart, 6);
  return `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`;
};

export const formatDayShort = (date: Date): string => {
  return format(date, "EEE d");
};

export const formatDateKey = (date: Date): string => {
  return format(date, "yyyy-MM-dd");
};

export const parseTimeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

export const calculateShiftHours = (
  shiftType: string,
  customStartTime: string | null,
  customEndTime: string | null,
  openTime: string | null,
  closeTime: string | null,
  amStart: string,
  amEnd: string,
  pmStart: string,
  pmEnd: string
): number => {
  let startMinutes: number;
  let endMinutes: number;

  switch (shiftType) {
    case "full_day":
      if (!openTime || !closeTime) return 0;
      startMinutes = parseTimeToMinutes(openTime);
      endMinutes = parseTimeToMinutes(closeTime);
      break;
    case "am":
      startMinutes = parseTimeToMinutes(amStart);
      endMinutes = parseTimeToMinutes(amEnd);
      break;
    case "pm":
      startMinutes = parseTimeToMinutes(pmStart);
      endMinutes = parseTimeToMinutes(pmEnd);
      break;
    case "custom":
      if (!customStartTime || !customEndTime) return 0;
      startMinutes = parseTimeToMinutes(customStartTime);
      endMinutes = parseTimeToMinutes(customEndTime);
      break;
    default:
      return 0;
  }

  return Math.max(0, (endMinutes - startMinutes) / 60);
};

export const getShiftTimeDisplay = (
  shiftType: string,
  customStartTime: string | null,
  customEndTime: string | null,
  amStart: string,
  amEnd: string,
  pmStart: string,
  pmEnd: string
): string => {
  switch (shiftType) {
    case "full_day":
      return "Full Day";
    case "am":
      return `AM (${amStart.slice(0, 5)}-${amEnd.slice(0, 5)})`;
    case "pm":
      return `PM (${pmStart.slice(0, 5)}-${pmEnd.slice(0, 5)})`;
    case "custom":
      if (customStartTime && customEndTime) {
        return `${customStartTime.slice(0, 5)}-${customEndTime.slice(0, 5)}`;
      }
      return "Custom";
    default:
      return shiftType;
  }
};
