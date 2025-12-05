import { useState } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Phone, Copy, Sun, Moon, Clock } from "lucide-react";
import { StaffSelectionDialog } from "./StaffSelectionDialog";
import type { RotaShift } from "@/hooks/useRotaSchedule";
import type { StaffingRule } from "@/hooks/useRotaRules";
import type { Database } from "@/integrations/supabase/types";

type ShiftType = Database["public"]["Enums"]["shift_type"];

interface OpeningHours {
  is_closed: boolean;
  open_time: string | null;
  close_time: string | null;
}

interface JobTitle {
  id: string;
  name: string;
}

interface StaffMember {
  id: string;
  first_name: string | null;
  last_name: string | null;
  job_title_id: string | null;
  job_title_name: string | null;
  working_days: Record<string, boolean> | null;
  contracted_hours: number | null;
}

interface RoleDayCellProps {
  date: Date;
  dateKey: string;
  shifts: RotaShift[];
  openingHours: OpeningHours | null;
  staffingRules: StaffingRule[];
  jobTitles: JobTitle[];
  availableStaff: StaffMember[];
  scheduledHours: Record<string, number>;
  requireOnCall: boolean;
  loading?: boolean;
  previousDateKey: string | null;
  amShiftStart?: string;
  amShiftEnd?: string;
  pmShiftStart?: string;
  pmShiftEnd?: string;
  onAddShift: (userId: string, dateKey: string, shiftType: ShiftType, isOnCall: boolean) => Promise<void>;
  onDeleteShift: (shiftId: string) => void;
  onEditShift: (shift: RotaShift) => void;
  onRepeatPreviousDay?: (dateKey: string, previousDateKey: string) => Promise<void>;
}

export const RoleDayCell = ({
  date,
  dateKey,
  shifts,
  openingHours,
  staffingRules,
  jobTitles,
  availableStaff,
  scheduledHours,
  requireOnCall,
  loading = false,
  previousDateKey,
  amShiftStart = "09:00",
  amShiftEnd = "13:00",
  pmShiftStart = "13:00",
  pmShiftEnd = "18:00",
  onAddShift,
  onDeleteShift,
  onEditShift,
  onRepeatPreviousDay,
}: RoleDayCellProps) => {
  const [selectionDialog, setSelectionDialog] = useState<{
    open: boolean;
    jobTitleId: string;
    jobTitleName: string;
    shiftType: ShiftType | "oncall";
  } | null>(null);

  const isClosed = openingHours?.is_closed ?? true;
  const dateLabel = format(date, "EEEE, d MMMM");

  // Separate shifts by type
  const onCallShift = shifts.find((s) => s.is_oncall) || null;
  const regularShifts = shifts.filter((s) => !s.is_oncall);
  const amShifts = regularShifts.filter((s) => s.shift_type === "am");
  const pmShifts = regularShifts.filter((s) => s.shift_type === "pm");
  const fullDayShifts = regularShifts.filter((s) => s.shift_type === "full_day");

  // Get all assigned user IDs for this day (for duplicate prevention)
  const assignedUserIds = shifts.map((s) => s.user_id);

  // Get user IDs that conflict with a given shift type
  const getConflictingUserIds = (targetShiftType: ShiftType | "oncall"): string[] => {
    if (targetShiftType === "oncall") {
      return assignedUserIds; // On-call conflicts with any existing assignment
    }
    if (targetShiftType === "full_day") {
      return assignedUserIds; // Full day conflicts with any existing assignment
    }
    if (targetShiftType === "am") {
      // AM conflicts with existing AM or Full Day
      return [...amShifts, ...fullDayShifts].map((s) => s.user_id);
    }
    if (targetShiftType === "pm") {
      // PM conflicts with existing PM or Full Day
      return [...pmShifts, ...fullDayShifts].map((s) => s.user_id);
    }
    return assignedUserIds;
  };

  // Count staff for AM column (AM shifts + Full Day shifts)
  const getAmCount = (jobTitleId: string) => {
    const amCount = amShifts.filter((s) => s.job_title_id === jobTitleId).length;
    const fullCount = fullDayShifts.filter((s) => s.job_title_id === jobTitleId).length;
    return amCount + fullCount;
  };

  // Count staff for PM column (PM shifts + Full Day shifts)
  const getPmCount = (jobTitleId: string) => {
    const pmCount = pmShifts.filter((s) => s.job_title_id === jobTitleId).length;
    const fullCount = fullDayShifts.filter((s) => s.job_title_id === jobTitleId).length;
    return pmCount + fullCount;
  };

  const handleAddClick = (jobTitleId: string, jobTitleName: string, shiftType: ShiftType | "oncall") => {
    setSelectionDialog({ open: true, jobTitleId, jobTitleName, shiftType });
  };

  const handleSelectStaff = async (userId: string) => {
    if (!selectionDialog) return;
    const isOnCall = selectionDialog.shiftType === "oncall";
    const actualShiftType: ShiftType = isOnCall ? "full_day" : selectionDialog.shiftType as ShiftType;
    await onAddShift(userId, dateKey, actualShiftType, isOnCall);
  };

  const getStaffForJobTitle = (jobTitleId: string) => {
    return availableStaff.filter((s) => s.job_title_id === jobTitleId);
  };

  const getShiftTypeLabel = (shiftType: ShiftType | "oncall") => {
    switch (shiftType) {
      case "am": return "AM";
      case "pm": return "PM";
      case "full_day": return "Full Day";
      case "oncall": return "On-Call";
      default: return "";
    }
  };

  const renderShiftCard = (shift: RotaShift, showFullBadge = false) => (
    <div
      key={shift.id}
      className="flex items-center justify-between gap-2 bg-muted/50 rounded-md px-3 py-2 cursor-pointer hover:bg-muted transition-colors"
      onClick={() => onEditShift(shift)}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm">{shift.user_name}</span>
        {showFullBadge && (
          <Badge variant="outline" className="text-[10px] px-1 py-0">Full</Badge>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 hover:bg-destructive/20"
        onClick={(e) => {
          e.stopPropagation();
          onDeleteShift(shift.id);
        }}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <div
      className={cn(
        "min-h-[200px] transition-colors",
        isClosed && "bg-muted/30"
      )}
    >
      {/* Header with opening hours and copy button */}
      {!isClosed && (
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/20">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">{dateLabel}</span>
            {openingHours?.open_time && openingHours?.close_time && (
              <span className="text-sm text-muted-foreground">
                {openingHours.open_time.slice(0, 5)} - {openingHours.close_time.slice(0, 5)}
              </span>
            )}
          </div>
          {previousDateKey && onRepeatPreviousDay && (
            <Button
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => onRepeatPreviousDay(dateKey, previousDateKey)}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy Previous Day
            </Button>
          )}
        </div>
      )}

      {isClosed && (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <p className="text-sm italic">This day is closed</p>
        </div>
      )}

      {!isClosed && (
        <div className="p-4 space-y-4">
          {/* On-Call Row */}
          {requireOnCall && (
            <div className="rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">On-Call</span>
                </div>
                {onCallShift ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {onCallShift.user_name}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 hover:bg-destructive/20"
                      onClick={() => onDeleteShift(onCallShift.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={loading}
                    onClick={() => handleAddClick("", "On-Call Staff", "oncall")}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* AM/PM Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* AM Column */}
            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                <Sun className="h-4 w-4 text-amber-500" />
                <span className="font-medium text-sm">AM</span>
                <span className="text-xs text-muted-foreground">
                  ({amShiftStart.slice(0, 5)} - {amShiftEnd.slice(0, 5)})
                </span>
              </div>
              
              {staffingRules.map((rule) => {
                const jobTitle = jobTitles.find((jt) => jt.id === rule.job_title_id);
                if (!jobTitle) return null;

                const amForRole = amShifts.filter((s) => s.job_title_id === rule.job_title_id);
                const fullForRole = fullDayShifts.filter((s) => s.job_title_id === rule.job_title_id);
                const count = getAmCount(rule.job_title_id);
                const met = count >= rule.min_staff;

                return (
                  <div key={rule.id} className="mb-3 last:mb-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{jobTitle.name}</span>
                        <span
                          className={cn(
                            "text-xs font-mono px-1.5 py-0.5 rounded",
                            met
                              ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                              : "bg-amber-500/20 text-amber-700 dark:text-amber-400"
                          )}
                        >
                          {count}/{rule.min_staff}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={loading}
                        onClick={() => handleAddClick(rule.job_title_id, jobTitle.name, "am")}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {(amForRole.length > 0 || fullForRole.length > 0) && (
                      <div className="space-y-1">
                        {amForRole.map((shift) => renderShiftCard(shift))}
                        {fullForRole.map((shift) => renderShiftCard(shift, true))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* PM Column */}
            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                <Moon className="h-4 w-4 text-indigo-500" />
                <span className="font-medium text-sm">PM</span>
                <span className="text-xs text-muted-foreground">
                  ({pmShiftStart.slice(0, 5)} - {pmShiftEnd.slice(0, 5)})
                </span>
              </div>
              
              {staffingRules.map((rule) => {
                const jobTitle = jobTitles.find((jt) => jt.id === rule.job_title_id);
                if (!jobTitle) return null;

                const pmForRole = pmShifts.filter((s) => s.job_title_id === rule.job_title_id);
                const fullForRole = fullDayShifts.filter((s) => s.job_title_id === rule.job_title_id);
                const count = getPmCount(rule.job_title_id);
                const met = count >= rule.min_staff;

                return (
                  <div key={rule.id} className="mb-3 last:mb-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{jobTitle.name}</span>
                        <span
                          className={cn(
                            "text-xs font-mono px-1.5 py-0.5 rounded",
                            met
                              ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                              : "bg-amber-500/20 text-amber-700 dark:text-amber-400"
                          )}
                        >
                          {count}/{rule.min_staff}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={loading}
                        onClick={() => handleAddClick(rule.job_title_id, jobTitle.name, "pm")}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {(pmForRole.length > 0 || fullForRole.length > 0) && (
                      <div className="space-y-1">
                        {pmForRole.map((shift) => renderShiftCard(shift))}
                        {fullForRole.map((shift) => renderShiftCard(shift, true))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Full Day Section */}
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">Full Day</span>
              {openingHours?.open_time && openingHours?.close_time && (
                <span className="text-xs text-muted-foreground">
                  ({openingHours.open_time.slice(0, 5)} - {openingHours.close_time.slice(0, 5)})
                </span>
              )}
            </div>

            {staffingRules.map((rule) => {
              const jobTitle = jobTitles.find((jt) => jt.id === rule.job_title_id);
              if (!jobTitle) return null;

              const fullForRole = fullDayShifts.filter((s) => s.job_title_id === rule.job_title_id);

              return (
                <div key={rule.id} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-sm font-medium w-24">{jobTitle.name}</span>
                    <div className="flex flex-wrap gap-1">
                      {fullForRole.map((shift) => (
                        <div
                          key={shift.id}
                          className="flex items-center gap-1 bg-muted/50 rounded-md px-2 py-1 cursor-pointer hover:bg-muted transition-colors"
                          onClick={() => onEditShift(shift)}
                        >
                          <span className="text-sm">{shift.user_name}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 hover:bg-destructive/20"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteShift(shift.id);
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={loading}
                    onClick={() => handleAddClick(rule.job_title_id, jobTitle.name, "full_day")}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Full Day
                  </Button>
                </div>
              );
            })}
          </div>

          {/* Empty state if no staffing rules */}
          {staffingRules.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No staffing rules configured. Add them in the Rules tab.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Staff Selection Dialog */}
      {selectionDialog && (
        <StaffSelectionDialog
          open={selectionDialog.open}
          onOpenChange={(open) => !open && setSelectionDialog(null)}
          jobTitleId={selectionDialog.jobTitleId}
          jobTitleName={selectionDialog.jobTitleName}
          shiftType={selectionDialog.shiftType}
          dateLabel={dateLabel}
          availableStaff={
            selectionDialog.shiftType === "oncall"
              ? availableStaff
              : getStaffForJobTitle(selectionDialog.jobTitleId)
          }
          excludeUserIds={getConflictingUserIds(selectionDialog.shiftType)}
          scheduledHours={scheduledHours}
          onSelectStaff={handleSelectStaff}
        />
      )}
    </div>
  );
};