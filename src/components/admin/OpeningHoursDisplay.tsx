import { Badge } from "@/components/ui/badge";

interface OpeningHour {
  day_of_week: number;
  am_open_time: string | null;
  am_close_time: string | null;
  pm_open_time: string | null;
  pm_close_time: string | null;
  is_closed: boolean | null;
}

interface OpeningHoursDisplayProps {
  hours: OpeningHour[];
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const OpeningHoursDisplay = ({ hours }: OpeningHoursDisplayProps) => {
  const getHoursForDay = (dayIndex: number) => {
    return hours.find((h) => h.day_of_week === dayIndex);
  };

  const formatTime = (time: string | null) => {
    if (!time) return "";
    return time.slice(0, 5);
  };

  return (
    <div className="space-y-1">
      {DAYS.map((day, index) => {
        const dayHours = getHoursForDay(index);
        const isClosed = dayHours?.is_closed ?? true;

        return (
          <div
            key={day}
            className="flex items-center justify-between text-sm py-0.5"
          >
            <span className="text-muted-foreground w-10">{day}</span>
            {isClosed ? (
              <Badge variant="secondary" className="text-xs font-normal">
                Closed
              </Badge>
            ) : (
              <div className="flex items-center gap-2 text-foreground text-xs">
                <span>
                  {formatTime(dayHours?.am_open_time)}-{formatTime(dayHours?.am_close_time)}
                </span>
                <span className="text-muted-foreground">|</span>
                <span>
                  {formatTime(dayHours?.pm_open_time)}-{formatTime(dayHours?.pm_close_time)}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
