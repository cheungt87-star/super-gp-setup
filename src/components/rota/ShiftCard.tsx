import { X, Phone, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { getShiftTimeDisplay } from "@/lib/rotaUtils";
import type { RotaShift } from "@/hooks/useRotaSchedule";

interface ShiftCardProps {
  shift: RotaShift;
  rotaRules: {
    am_shift_start: string;
    am_shift_end: string;
    pm_shift_start: string;
    pm_shift_end: string;
  } | null;
  onClick: () => void;
  onDelete: () => void;
}

const isExternalTemp = (shift: RotaShift) => shift.is_temp_staff && !shift.user_id && shift.temp_staff_name;

export const ShiftCard = ({ shift, rotaRules, onClick, onDelete }: ShiftCardProps) => {
  const timeDisplay = rotaRules
    ? getShiftTimeDisplay(
        shift.shift_type,
        shift.custom_start_time,
        shift.custom_end_time,
        rotaRules.am_shift_start,
        rotaRules.am_shift_end,
        rotaRules.pm_shift_start,
        rotaRules.pm_shift_end
      )
    : shift.shift_type;

  const initials = shift.user_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "??";

  const isExternal = isExternalTemp(shift);

  return (
    <div
      className={cn(
        "group relative p-2 rounded text-xs cursor-pointer transition-all",
        isExternal 
          ? shift.temp_confirmed 
            ? "bg-amber-50 hover:bg-amber-100 border border-amber-300"
            : "bg-red-50 hover:bg-red-100 border-2 border-red-400"
          : shift.is_temp_staff
            ? shift.temp_confirmed
              ? "bg-amber-50 hover:bg-amber-100 border border-amber-300"
              : "bg-red-50 hover:bg-red-100 border-2 border-red-400"
            : "bg-primary/10 hover:bg-primary/20 border border-primary/20",
        shift.is_oncall && "ring-2 ring-orange-400"
      )}
      onClick={onClick}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
      >
        <X className="h-3 w-3" />
      </button>

      <div className="flex items-center gap-1.5">
        <div className={cn(
          "h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-medium shrink-0",
          isExternal ? "bg-orange-200" : "bg-primary/20"
        )}>
          {isExternal ? <UserPlus className="h-3 w-3 text-orange-600" /> : initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{shift.user_name}</p>
          {isExternal && (
            <span className={cn(
              "text-[9px] px-1 py-0.5 rounded",
              shift.temp_confirmed ? "bg-amber-200 text-amber-700" : "bg-red-200 text-red-700"
            )}>
              {shift.temp_confirmed ? "TEMP" : "⚠️ TEMP"}
            </span>
          )}
        </div>
        {shift.is_oncall && (
          <Phone className="h-3 w-3 text-orange-500 shrink-0" />
        )}
      </div>
      <p className="text-muted-foreground mt-0.5 truncate">{timeDisplay}</p>
    </div>
  );
};
