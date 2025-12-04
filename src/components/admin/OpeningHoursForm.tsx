import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const DAYS = [
  { value: 0, label: "Monday" },
  { value: 1, label: "Tuesday" },
  { value: 2, label: "Wednesday" },
  { value: 3, label: "Thursday" },
  { value: 4, label: "Friday" },
  { value: 5, label: "Saturday" },
  { value: 6, label: "Sunday" },
];

export interface OpeningHour {
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
}

interface OpeningHoursFormProps {
  hours: OpeningHour[];
  onChange: (hours: OpeningHour[]) => void;
}

export const OpeningHoursForm = ({ hours, onChange }: OpeningHoursFormProps) => {
  const getHourForDay = (dayOfWeek: number): OpeningHour => {
    return hours.find(h => h.day_of_week === dayOfWeek) || {
      day_of_week: dayOfWeek,
      open_time: "09:00",
      close_time: "17:00",
      is_closed: false,
    };
  };

  const updateHour = (dayOfWeek: number, updates: Partial<OpeningHour>) => {
    const existing = hours.find(h => h.day_of_week === dayOfWeek);
    if (existing) {
      onChange(hours.map(h => h.day_of_week === dayOfWeek ? { ...h, ...updates } : h));
    } else {
      onChange([...hours, { ...getHourForDay(dayOfWeek), ...updates }]);
    }
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Opening Hours</Label>
      <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
        {DAYS.map((day) => {
          const hour = getHourForDay(day.value);
          return (
            <div key={day.value} className="flex items-center gap-3">
              <span className="w-24 text-sm font-medium">{day.label}</span>
              <Input
                type="time"
                value={hour.open_time}
                onChange={(e) => updateHour(day.value, { open_time: e.target.value })}
                disabled={hour.is_closed}
                className="w-28"
              />
              <span className="text-muted-foreground text-sm">to</span>
              <Input
                type="time"
                value={hour.close_time}
                onChange={(e) => updateHour(day.value, { close_time: e.target.value })}
                disabled={hour.is_closed}
                className="w-28"
              />
              <div className="flex items-center gap-2 ml-2">
                <Checkbox
                  id={`closed-${day.value}`}
                  checked={hour.is_closed}
                  onCheckedChange={(checked) => updateHour(day.value, { is_closed: checked === true })}
                />
                <Label htmlFor={`closed-${day.value}`} className="text-sm text-muted-foreground cursor-pointer">
                  Closed
                </Label>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
