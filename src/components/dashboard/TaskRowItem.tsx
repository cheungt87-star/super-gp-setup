import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { TaskWithDueDate, formatEta } from "@/lib/taskUtils";

interface TaskRowItemProps {
  task: TaskWithDueDate;
  onClick: () => void;
}

const TaskRowItem = ({ task, onClick }: TaskRowItemProps) => {
  const etaText = formatEta(task.eta, task.isOverdue, task.isToday);

  return (
    <div
      onClick={onClick}
      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors"
    >
      <div className="flex-1 min-w-0 mr-4">
        <p className="font-medium text-sm truncate">{task.name}</p>
        <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
          {task.isJobFamilyAssignment ? (
            <>
              <Users className="h-3 w-3" />
              <span>{task.job_family_name || "Team"}</span>
            </>
          ) : (
            task.assignee_name || "Unassigned"
          )}
        </p>
      </div>
      
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="text-xs text-muted-foreground hidden sm:block">
          {format(task.currentDueDate, "MMM d")}
        </span>
        
        <Badge
          variant={task.isOverdue ? "destructive" : task.isToday ? "default" : "secondary"}
          className="text-xs whitespace-nowrap"
        >
          {etaText}
        </Badge>
      </div>
    </div>
  );
};

export default TaskRowItem;
