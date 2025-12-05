import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addWeeks, subWeeks } from "date-fns";
import { formatWeekRange, getWeekStartDate } from "@/lib/rotaUtils";

interface WeekSelectorProps {
  weekStart: Date;
  onWeekChange: (newWeekStart: Date) => void;
}

export const WeekSelector = ({ weekStart, onWeekChange }: WeekSelectorProps) => {
  const handlePrevWeek = () => {
    onWeekChange(subWeeks(weekStart, 1));
  };

  const handleNextWeek = () => {
    onWeekChange(addWeeks(weekStart, 1));
  };

  const handleToday = () => {
    onWeekChange(getWeekStartDate(new Date()));
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" onClick={handlePrevWeek}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="min-w-[180px] text-center font-medium">
        {formatWeekRange(weekStart)}
      </div>
      <Button variant="outline" size="icon" onClick={handleNextWeek}>
        <ChevronRight className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="sm" onClick={handleToday}>
        Today
      </Button>
    </div>
  );
};
