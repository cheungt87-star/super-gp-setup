import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ShiftCard } from "./ShiftCard";
import type { RotaShift } from "@/hooks/useRotaSchedule";

interface OpeningHours {
  is_closed: boolean;
  open_time: string | null;
  close_time: string | null;
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
  onShiftClick: (shift: RotaShift) => void;
  onDeleteShift: (shiftId: string) => void;
}

export const DroppableDayCell = ({
  date,
  dateKey,
  shifts,
  openingHours,
  rotaRules,
  onShiftClick,
  onDeleteShift,
}: DroppableDayCellProps) => {
  const { isOver, setNodeRef } = useDroppable({
    id: dateKey,
    data: { date, dateKey },
  });

  const isClosed = openingHours?.is_closed ?? true;
  const dayName = format(date, "EEE");
  const dayNum = format(date, "d");

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[160px] border-r last:border-r-0 p-2 transition-colors",
        isClosed && "bg-muted/30",
        isOver && !isClosed && "bg-primary/10"
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
        <div className="space-y-1">
          {shifts.map((shift) => (
            <ShiftCard
              key={shift.id}
              shift={shift}
              rotaRules={rotaRules}
              onClick={() => onShiftClick(shift)}
              onDelete={() => onDeleteShift(shift.id)}
            />
          ))}
          {shifts.length === 0 && isOver && (
            <div className="h-12 border-2 border-dashed border-primary/50 rounded flex items-center justify-center">
              <span className="text-xs text-primary">Drop here</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
