import { useState, useMemo } from "react";
import { ClipboardList } from "lucide-react";
import { TaskWithDueDate, expandTaskOccurrences } from "@/lib/taskUtils";
import TaskRowItem from "./TaskRowItem";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TaskWidgetProps {
  title: string;
  tasks: TaskWithDueDate[];
  onTaskClick: (task: TaskWithDueDate) => void;
  variant: "personal" | "jobfamily";
}

const FILTER_OPTIONS = [
  { value: 1, label: "1 day" },
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 60, label: "60 days" },
  { value: 90, label: "90 days" },
];

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
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-[#1E293B]">{title}</h2>
          <Select value={String(selectedDays)} onValueChange={(v) => setSelectedDays(Number(v))}>
            <SelectTrigger className="h-8 w-[110px] text-xs font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FILTER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={String(opt.value)} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span className="text-xs font-semibold text-white bg-[#6366F1] px-2.5 py-0.5 rounded-full">
          {filteredTasks.length}
        </span>
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
