import { useState, useMemo } from "react";
import { ClipboardList } from "lucide-react";
import { TaskWithDueDate, expandTaskOccurrences } from "@/lib/taskUtils";
import TaskRowItem from "./TaskRowItem";
import { cn } from "@/lib/utils";

interface TaskWidgetProps {
  title: string;
  tasks: TaskWithDueDate[];
  onTaskClick: (task: TaskWithDueDate) => void;
  variant: "personal" | "jobfamily";
}

const FILTER_OPTIONS = [1, 7, 30, 60, 90] as const;

const TaskWidget = ({ title, tasks, onTaskClick, variant }: TaskWidgetProps) => {
  const [selectedDays, setSelectedDays] = useState<number>(7);

  const filteredTasks = useMemo(() => {
    const expanded = tasks.flatMap((t) => expandTaskOccurrences(t, selectedDays));
    return expanded.sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      return a.currentDueDate.getTime() - b.currentDueDate.getTime();
    });
  }, [tasks, selectedDays]);

  return (
    <div className="h-full rounded-2xl bg-[#F8FAFC] p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-bold text-[#1E293B]">{title}</h2>
        <span className="text-xs font-semibold text-white bg-[#6366F1] px-2.5 py-0.5 rounded-full">
          {filteredTasks.length}
        </span>
      </div>
      <div className="flex items-center gap-1 mb-4">
        {FILTER_OPTIONS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setSelectedDays(d)}
            className={cn(
              "text-xs px-2.5 py-1 rounded-full transition-colors font-semibold",
              selectedDays === d
                ? "bg-[#6366F1] text-white"
                : "text-slate-500 hover:bg-slate-200"
            )}
          >
            {d}d
          </button>
        ))}
      </div>
      <div className="rounded-3xl bg-white p-5 shadow-[0_2px_20px_-4px_rgba(0,0,0,0.08)] space-y-2">
        {filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <ClipboardList className="h-8 w-8 text-slate-300 mb-2" />
            <p className="text-sm italic text-slate-400">No tasks</p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <TaskRowItem
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task)}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default TaskWidget;
