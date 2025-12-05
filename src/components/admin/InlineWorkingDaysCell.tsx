import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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
  { key: "mon", label: "Monday", short: "M" },
  { key: "tue", label: "Tuesday", short: "T" },
  { key: "wed", label: "Wednesday", short: "W" },
  { key: "thu", label: "Thursday", short: "T" },
  { key: "fri", label: "Friday", short: "F" },
  { key: "sat", label: "Saturday", short: "S" },
  { key: "sun", label: "Sunday", short: "S" },
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
  const [isSaving, setIsSaving] = useState(false);
  const [editValue, setEditValue] = useState<WorkingDays>(value || defaultWorkingDays);

  const handleToggleDay = (day: keyof WorkingDays) => {
    setEditValue((prev) => ({ ...prev, [day]: !prev[day] }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(editValue);
      setIsOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setEditValue(value || defaultWorkingDays);
    }
    setIsOpen(open);
  };

  if (isSaving) {
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  }

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <div className="flex gap-1 cursor-pointer hover:bg-muted/50 px-2 py-1 rounded -mx-2 transition-colors">
          {value ? (
            dayLabels.map(({ key, short }) => (
              <span
                key={key}
                className={cn(
                  "text-xs font-medium w-5 h-5 flex items-center justify-center rounded",
                  value[key]
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
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
      <PopoverContent className="w-auto p-4" align="start">
        <div className="space-y-3">
          <p className="text-sm font-medium">Working Days</p>
          <div className="grid grid-cols-2 gap-2">
            {dayLabels.map(({ key, label }) => (
              <div key={key} className="flex items-center space-x-2">
                <Checkbox
                  id={`day-${key}`}
                  checked={editValue[key]}
                  onCheckedChange={() => handleToggleDay(key)}
                />
                <Label htmlFor={`day-${key}`} className="text-sm font-normal cursor-pointer">
                  {label.slice(0, 3)}
                </Label>
              </div>
            ))}
          </div>
          <Button size="sm" onClick={handleSave} className="w-full">
            Save
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
