import { useState } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Plus, X, Phone, Copy } from "lucide-react";
import { StaffSelectionDialog } from "./StaffSelectionDialog";
import type { RotaShift } from "@/hooks/useRotaSchedule";
import type { StaffingRule } from "@/hooks/useRotaRules";

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
  onAddShift: (userId: string, dateKey: string, isOnCall: boolean) => Promise<void>;
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
  onAddShift,
  onDeleteShift,
  onEditShift,
  onRepeatPreviousDay,
}: RoleDayCellProps) => {
  const [selectionDialog, setSelectionDialog] = useState<{
    open: boolean;
    jobTitleId: string;
    jobTitleName: string;
    isOnCall: boolean;
  } | null>(null);

  const isClosed = openingHours?.is_closed ?? true;
  const dayName = format(date, "EEE");
  const dayNum = format(date, "d");
  const dateLabel = format(date, "EEEE, d MMMM");

  // Separate on-call and regular shifts
  const onCallShift = shifts.find((s) => s.is_oncall) || null;
  const regularShifts = shifts.filter((s) => !s.is_oncall);

  // Get assigned user IDs for this day
  const assignedUserIds = shifts.map((s) => s.user_id);

  // Count staff by job title
  const assignedByJobTitle: Record<string, RotaShift[]> = {};
  regularShifts.forEach((shift) => {
    const jobTitleId = shift.job_title_id;
    if (jobTitleId) {
      if (!assignedByJobTitle[jobTitleId]) {
        assignedByJobTitle[jobTitleId] = [];
      }
      assignedByJobTitle[jobTitleId].push(shift);
    }
  });

  const handleAddClick = (jobTitleId: string, jobTitleName: string, isOnCall = false) => {
    setSelectionDialog({ open: true, jobTitleId, jobTitleName, isOnCall });
  };

  const handleSelectStaff = async (userId: string) => {
    if (!selectionDialog) return;
    await onAddShift(userId, dateKey, selectionDialog.isOnCall);
  };

  const getStaffForJobTitle = (jobTitleId: string) => {
    return availableStaff.filter((s) => s.job_title_id === jobTitleId);
  };

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
                    onClick={() => handleAddClick("", "On-Call Staff", true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Role Rows */}
          {staffingRules.map((rule) => {
            const jobTitle = jobTitles.find((jt) => jt.id === rule.job_title_id);
            if (!jobTitle) return null;

            const assignedShifts = assignedByJobTitle[rule.job_title_id] || [];
            const assignedCount = assignedShifts.length;
            const met = assignedCount >= rule.min_staff;

            return (
              <div key={rule.id} className="rounded-lg border p-3">
                {/* Header Row */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{jobTitle.name}</span>
                    <span
                      className={cn(
                        "text-xs font-mono px-2 py-0.5 rounded",
                        met 
                          ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400" 
                          : "bg-amber-500/20 text-amber-700 dark:text-amber-400"
                      )}
                    >
                      {assignedCount}/{rule.min_staff}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={loading}
                    onClick={() => handleAddClick(rule.job_title_id, jobTitle.name)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>

                {/* Assigned Staff */}
                {assignedShifts.length > 0 && (
                  <div className="space-y-1">
                    {assignedShifts.map((shift) => (
                      <div
                        key={shift.id}
                        className="flex items-center justify-between gap-2 bg-muted/50 rounded-md px-3 py-2 cursor-pointer hover:bg-muted transition-colors"
                        onClick={() => onEditShift(shift)}
                      >
                        <span className="text-sm">{shift.user_name}</span>
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
                    ))}
                  </div>
                )}
              </div>
            );
          })}

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
          dateLabel={dateLabel}
          availableStaff={
            selectionDialog.isOnCall
              ? availableStaff
              : getStaffForJobTitle(selectionDialog.jobTitleId)
          }
          excludeUserIds={assignedUserIds}
          scheduledHours={scheduledHours}
          onSelectStaff={handleSelectStaff}
        />
      )}
    </div>
  );
};
