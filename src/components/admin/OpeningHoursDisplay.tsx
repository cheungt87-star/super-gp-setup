import { Badge } from "@/components/ui/badge";

interface OpeningHour {
  day_of_week: number;
  open_time: string | null;
  close_time: string | null;
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
              <span className="text-foreground">
                {formatTime(dayHours?.open_time)} - {formatTime(dayHours?.close_time)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};
