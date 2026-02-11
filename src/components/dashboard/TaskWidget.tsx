import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, User, Users } from "lucide-react";
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
  const Icon = variant === "personal" ? User : Users;
  const [selectedDays, setSelectedDays] = useState<number>(7);

  const filteredTasks = useMemo(() => {
    // Expand each task into multiple occurrences within the filter window
    const expanded = tasks.flatMap((t) => expandTaskOccurrences(t, selectedDays));
    // Sort: overdue first, then by due date
    return expanded.sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      return a.currentDueDate.getTime() - b.currentDueDate.getTime();
    });
  }, [tasks, selectedDays]);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
          </div>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {filteredTasks.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {FILTER_OPTIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setSelectedDays(d)}
              className={cn(
                "text-xs px-2 py-1 rounded-full transition-colors font-medium",
                selectedDays === d
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              {d}d
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <ClipboardList className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">No tasks</p>
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
      </CardContent>
    </Card>
  );
};

export default TaskWidget;
