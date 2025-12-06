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
  am_open_time: string;
  am_close_time: string;
  pm_open_time: string;
  pm_close_time: string;
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
      am_open_time: "09:00",
      am_close_time: "13:00",
      pm_open_time: "14:00",
      pm_close_time: "17:00",
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
      <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
        {DAYS.map((day) => {
          const hour = getHourForDay(day.value);
          return (
            <div key={day.value} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{day.label}</span>
                <div className="flex items-center gap-2">
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
              
              {!hour.is_closed && (
                <div className="grid grid-cols-2 gap-4 pl-2">
                  {/* AM Slot */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">AM</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={hour.am_open_time}
                        onChange={(e) => updateHour(day.value, { am_open_time: e.target.value })}
                        className="w-24 text-sm"
                      />
                      <span className="text-muted-foreground text-xs">to</span>
                      <Input
                        type="time"
                        value={hour.am_close_time}
                        onChange={(e) => updateHour(day.value, { am_close_time: e.target.value })}
                        className="w-24 text-sm"
                      />
                    </div>
                  </div>
                  
                  {/* PM Slot */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">PM</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={hour.pm_open_time}
                        onChange={(e) => updateHour(day.value, { pm_open_time: e.target.value })}
                        className="w-24 text-sm"
                      />
                      <span className="text-muted-foreground text-xs">to</span>
                      <Input
                        type="time"
                        value={hour.pm_close_time}
                        onChange={(e) => updateHour(day.value, { pm_close_time: e.target.value })}
                        className="w-24 text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
