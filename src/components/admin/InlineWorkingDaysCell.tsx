import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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

const dayLabels: { key: keyof WorkingDays; label: string; short: string }[] = [
  { key: "mon", label: "Mon", short: "M" },
  { key: "tue", label: "Tue", short: "T" },
  { key: "wed", label: "Wed", short: "W" },
  { key: "thu", label: "Thu", short: "T" },
  { key: "fri", label: "Fri", short: "F" },
  { key: "sat", label: "Sat", short: "S" },
  { key: "sun", label: "Sun", short: "S" },
];

interface InlineWorkingDaysCellProps {
  value: WorkingDays | null;
  onSave: (value: WorkingDays) => Promise<void>;
}

export const InlineWorkingDaysCell = ({
  value,
  onSave,
}: InlineWorkingDaysCellProps) => {
  const [isOpen, setIsOpen] = useState(false);
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
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div className="flex gap-1 cursor-pointer hover:bg-muted/50 px-2 py-1 rounded -mx-2 transition-colors">
          {value ? (
            dayLabels.map(({ key, short }) => (
              <span
                key={key}
                className={cn(
                  "text-xs font-medium w-5 h-5 flex items-center justify-center rounded",
                  value[key]
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-600"
                )}
              >
                {short}
              </span>
            ))
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-3" align="start">
        <p className="text-sm font-medium mb-3">Working Days</p>
        <div className="space-y-2">
          {dayLabels.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <Label htmlFor={`day-${key}`} className="text-sm font-normal cursor-pointer">
                {label}
              </Label>
              {savingDay === key ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <Switch
                  id={`day-${key}`}
                  checked={currentValue[key]}
                  onCheckedChange={() => handleToggleDay(key)}
                  disabled={savingDay !== null}
                  className="scale-90"
                />
              )}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
