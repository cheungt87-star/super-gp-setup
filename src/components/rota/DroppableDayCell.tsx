import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ShiftCard } from "./ShiftCard";
import { OnCallDropZone } from "./OnCallDropZone";
import { StaffingRequirements } from "./StaffingRequirements";
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

interface DroppableDayCellProps {
  date: Date;
  dateKey: string;
  shifts: RotaShift[];
  openingHours: OpeningHours | null;
  rotaRules: {
    am_shift_start: string;
    am_shift_end: string;
    pm_shift_start: string;
    pm_shift_end: string;
  } | null;
  staffingRules: StaffingRule[];
  jobTitles: JobTitle[];
  onShiftClick: (shift: RotaShift) => void;
  onDeleteShift: (shiftId: string) => void;
}

export const DroppableDayCell = ({
  date,
  dateKey,
  shifts,
  openingHours,
  rotaRules,
  staffingRules,
  jobTitles,
  onShiftClick,
  onDeleteShift,
}: DroppableDayCellProps) => {
  const { isOver, setNodeRef } = useDroppable({
    id: dateKey,
    data: { date, dateKey, isOnCall: false },
  });

  const isClosed = openingHours?.is_closed ?? true;
  const dayName = format(date, "EEE");
  const dayNum = format(date, "d");

  // Separate on-call and regular shifts
  const onCallShift = shifts.find((s) => s.is_oncall) || null;
  const regularShifts = shifts.filter((s) => !s.is_oncall);

  return (
    <div
      className={cn(
        "min-h-[200px] border-r last:border-r-0 p-2 transition-colors",
        isClosed && "bg-muted/30"
      )}
    >
      <div className="text-center mb-2">
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
      </div>

      {!isClosed && (
        <>
          {/* On-Call Drop Zone */}
          <OnCallDropZone
            dateKey={dateKey}
            onCallShift={onCallShift}
            onRemoveOnCall={onDeleteShift}
          />

          {/* Staffing Requirements Countdown */}
          <StaffingRequirements
            shifts={shifts}
            staffingRules={staffingRules}
            jobTitles={jobTitles}
          />

          {/* Regular Shifts Drop Zone */}
          <div
            ref={setNodeRef}
            className={cn(
              "space-y-1 min-h-[60px] rounded p-1 transition-colors",
              isOver && "bg-primary/10 border border-dashed border-primary/50"
            )}
          >
            {regularShifts.map((shift) => (
              <ShiftCard
                key={shift.id}
                shift={shift}
                rotaRules={rotaRules}
                onClick={() => onShiftClick(shift)}
                onDelete={() => onDeleteShift(shift.id)}
              />
            ))}
            {regularShifts.length === 0 && (
              <div className={cn(
                "h-10 border border-dashed rounded flex items-center justify-center",
                isOver ? "border-primary/50" : "border-muted-foreground/20"
              )}>
                <span className="text-xs text-muted-foreground">
                  {isOver ? "Drop here" : "No shifts"}
                </span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
