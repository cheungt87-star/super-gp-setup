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
      <div className="inline-flex items-center border border-slate-300 rounded-lg bg-slate-50 overflow-hidden">
        <button
          onClick={handlePrevWeek}
          className="h-10 w-10 inline-flex items-center justify-center hover:bg-slate-100 transition-colors text-slate-600"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="border-l border-r border-slate-300 px-4 h-10 flex items-center min-w-[170px] justify-center">
          <span className="text-sm font-medium text-slate-700">{formatWeekRange(weekStart)}</span>
        </div>
        <button
          onClick={handleNextWeek}
          className="h-10 w-10 inline-flex items-center justify-center hover:bg-slate-100 transition-colors text-slate-600"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <Button variant="ghost" size="sm" onClick={handleToday} className="text-xs text-slate-500 hover:text-slate-700">
        Today
      </Button>
    </div>
  );
};
