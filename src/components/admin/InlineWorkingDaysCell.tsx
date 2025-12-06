import { useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface WorkingDays {
  mon: boolean;
  tue: boolean;
  wed: boolean;
  thu: boolean;
  fri: boolean;
  sat: boolean;
  sun: boolean;
}

const defaultWorkingDays: WorkingDays = {
  mon: false,
  tue: false,
  wed: false,
  thu: false,
  fri: false,
  sat: false,
  sun: false,
};

const dayLabels: { key: keyof WorkingDays; short: string }[] = [
  { key: "mon", short: "M" },
  { key: "tue", short: "T" },
  { key: "wed", short: "W" },
  { key: "thu", short: "T" },
  { key: "fri", short: "F" },
  { key: "sat", short: "S" },
  { key: "sun", short: "S" },
];

interface InlineWorkingDaysCellProps {
  value: WorkingDays | null;
  onSave: (value: WorkingDays) => Promise<void>;
}

export const InlineWorkingDaysCell = ({
  value,
  onSave,
}: InlineWorkingDaysCellProps) => {
  const [savingDay, setSavingDay] = useState<keyof WorkingDays | null>(null);

  const currentValue = value || defaultWorkingDays;

  const handleToggleDay = async (day: keyof WorkingDays) => {
    setSavingDay(day);
    try {
      const newValue = { ...currentValue, [day]: !currentValue[day] };
      await onSave(newValue);
    } finally {
      setSavingDay(null);
    }
  };

  return (
    <div className="flex gap-1">
      {dayLabels.map(({ key, short }) => (
        <button
          key={key}
          onClick={() => handleToggleDay(key)}
          disabled={savingDay !== null}
          className={cn(
            "text-xs font-medium w-5 h-5 flex items-center justify-center rounded transition-colors",
            currentValue[key]
              ? "bg-green-100 text-green-700 hover:bg-green-200"
              : "bg-red-100 text-red-600 hover:bg-red-200",
            savingDay !== null && "opacity-50 cursor-not-allowed"
          )}
        >
          {savingDay === key ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            short
          )}
        </button>
      ))}
    </div>
  );
};
