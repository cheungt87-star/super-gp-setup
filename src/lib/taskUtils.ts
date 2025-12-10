import { differenceInDays, addDays, addWeeks, addMonths, startOfDay, isBefore, isAfter, isEqual } from "date-fns";

export interface WorkflowTaskWithDetails {
  id: string;
  name: string;
  description: string | null;
  site_id: string;
  site_name?: string;
  facility_id: string | null;
  facility_name?: string;
  assignee_id: string | null;
  assignee_name?: string;
  job_family_id: string | null;
  job_family_name?: string;
  initial_due_date: string;
  recurrence_pattern: "daily" | "weekly" | "monthly" | "custom";
  recurrence_interval_days: number | null;
  is_active: boolean;
  organisation_id: string;
  isJobFamilyAssignment?: boolean;
}

export interface TaskWithDueDate extends WorkflowTaskWithDetails {
  currentDueDate: Date;
  eta: number; // Days until due (negative if overdue)
  isOverdue: boolean;
  isToday: boolean;
}

/**
 * Calculate the current due date for a recurring task based on its recurrence pattern.
 * Returns the next upcoming due date or the most recent past due date if overdue.
 */
export function calculateCurrentDueDate(
  initialDueDate: string,
  recurrencePattern: "daily" | "weekly" | "monthly" | "custom",
  recurrenceIntervalDays: number | null
): Date {
  const today = startOfDay(new Date());
  const initial = startOfDay(new Date(initialDueDate));

  // If initial date is in the future, return it
  if (isAfter(initial, today) || isEqual(initial, today)) {
    return initial;
  }

  // Calculate how many cycles have passed
  let currentDue = initial;
  
  while (isBefore(currentDue, today)) {
    const nextDue = getNextDueDate(currentDue, recurrencePattern, recurrenceIntervalDays);
    if (isAfter(nextDue, today) || isEqual(nextDue, today)) {
      // Check if we're closer to the current or next due date
      const daysToNext = differenceInDays(nextDue, today);
      const daysSinceCurrent = differenceInDays(today, currentDue);
      
      // If the current due date has passed, move to next one
      if (daysSinceCurrent > 0) {
        currentDue = nextDue;
      }
      break;
    }
    currentDue = nextDue;
  }

  return currentDue;
}

/**
 * Get the next due date based on recurrence pattern
 */
function getNextDueDate(
  currentDate: Date,
  pattern: "daily" | "weekly" | "monthly" | "custom",
  intervalDays: number | null
): Date {
  switch (pattern) {
    case "daily":
      return addDays(currentDate, 1);
    case "weekly":
      return addWeeks(currentDate, 1);
    case "monthly":
      return addMonths(currentDate, 1);
    case "custom":
      return addDays(currentDate, intervalDays || 1);
    default:
      return addDays(currentDate, 1);
  }
}

/**
 * Calculate ETA (days until due) and status flags
 */
export function calculateEta(dueDate: Date): { eta: number; isOverdue: boolean; isToday: boolean } {
  const today = startOfDay(new Date());
  const due = startOfDay(dueDate);
  const eta = differenceInDays(due, today);
  
  return {
    eta,
    isOverdue: eta < 0,
    isToday: eta === 0
  };
}

/**
 * Format ETA for display
 */
export function formatEta(eta: number, isOverdue: boolean, isToday: boolean): string {
  if (isToday) return "Due today";
  if (isOverdue) {
    const days = Math.abs(eta);
    return `Overdue by ${days} day${days !== 1 ? "s" : ""}`;
  }
  return `In ${eta} day${eta !== 1 ? "s" : ""}`;
}

/**
 * Enrich a task with calculated due date and ETA
 */
export function enrichTaskWithDueDate(task: WorkflowTaskWithDetails): TaskWithDueDate {
  const currentDueDate = calculateCurrentDueDate(
    task.initial_due_date,
    task.recurrence_pattern,
    task.recurrence_interval_days
  );
  const { eta, isOverdue, isToday } = calculateEta(currentDueDate);
  
  return {
    ...task,
    currentDueDate,
    eta,
    isOverdue,
    isToday
  };
}
