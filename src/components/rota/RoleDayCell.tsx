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
        "min-h-[200px] border-r last:border-r-0 transition-colors",
        isClosed && "bg-muted/30"
      )}
    >
      {/* Day Header */}
      <div className="text-center py-2 border-b bg-muted/20">
        <p className="text-xs text-muted-foreground">{dayName}</p>
        <p className="font-semibold">{dayNum}</p>
        {!isClosed && openingHours?.open_time && openingHours?.close_time && (
          <p className="text-xs text-muted-foreground">
            {openingHours.open_time.slice(0, 5)}-{openingHours.close_time.slice(0, 5)}
          </p>
        )}
        {isClosed && (
          <p className="text-xs text-muted-foreground italic">Closed</p>
        )}
        {/* Copy Previous Day Button */}
        {previousDateKey && onRepeatPreviousDay && !isClosed && (
          <Button
            variant="ghost"
            size="sm"
            className="h-5 mt-1 text-[10px] text-muted-foreground hover:text-foreground px-1.5"
            disabled={loading}
            onClick={() => onRepeatPreviousDay(dateKey, previousDateKey)}
          >
            <Copy className="h-3 w-3 mr-0.5" />
            Copy prev
          </Button>
        )}
      </div>

      {!isClosed && (
        <div className="p-1 space-y-0">
          {/* On-Call Row - Compact */}
          {requireOnCall && (
            <div className="border-b border-border/50 py-1 px-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  <span className="font-medium">On-Call</span>
                </div>
                {onCallShift ? (
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-medium truncate max-w-[60px]">
                      {onCallShift.user_name?.split(" ")[0]}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 hover:bg-destructive/20"
                      onClick={() => onDeleteShift(onCallShift.id)}
                    >
                      <X className="h-2.5 w-2.5" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    disabled={loading}
                    onClick={() => handleAddClick("", "On-Call Staff", true)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Role Rows - Compact with inline staff */}
          {staffingRules.map((rule, index) => {
            const jobTitle = jobTitles.find((jt) => jt.id === rule.job_title_id);
            if (!jobTitle) return null;

            const assignedShifts = assignedByJobTitle[rule.job_title_id] || [];
            const assignedCount = assignedShifts.length;
            const met = assignedCount >= rule.min_staff;
            const isLast = index === staffingRules.length - 1;

            return (
              <div
                key={rule.id}
                className={cn(
                  "py-1 px-1",
                  !isLast && "border-b border-border/50"
                )}
              >
                {/* Header Row - Always visible */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-medium truncate max-w-[50px]" title={jobTitle.name}>
                      {jobTitle.name.length > 6 ? jobTitle.name.substring(0, 5) + "…" : jobTitle.name}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-mono px-1 rounded",
                        met 
                          ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400" 
                          : "bg-amber-500/20 text-amber-700 dark:text-amber-400"
                      )}
                    >
                      {assignedCount}/{rule.min_staff}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    disabled={loading}
                    onClick={() => handleAddClick(rule.job_title_id, jobTitle.name)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>

                {/* Assigned Staff - Only show if there are any */}
                {assignedShifts.length > 0 && (
                  <div className="mt-0.5 space-y-0.5">
                    {assignedShifts.map((shift) => (
                      <div
                        key={shift.id}
                        className="flex items-center justify-between gap-1 bg-muted/50 rounded px-1.5 py-0.5 cursor-pointer hover:bg-muted"
                        onClick={() => onEditShift(shift)}
                      >
                        <span className="text-xs truncate">{shift.user_name}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 hover:bg-destructive/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteShift(shift.id);
                          }}
                        >
                          <X className="h-2.5 w-2.5" />
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
            <div className="text-center py-4">
              <p className="text-xs text-muted-foreground">
                No staffing rules
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
