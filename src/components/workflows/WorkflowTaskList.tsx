import { Button } from "@/components/ui/button";
import { Pencil, Trash2, ArrowUpDown, Plus, Users } from "lucide-react";
import { format } from "date-fns";
import RecurrenceDisplay from "./RecurrenceDisplay";
import WorkflowInlineTaskForm, { WorkflowFormValues, CreateWorkflowFormValues } from "./WorkflowInlineTaskForm";

interface Site {
  id: string;
  name: string;
}

interface JobFamily {
  id: string;
  name: string;
}

interface WorkflowTask {
  id: string;
  name: string;
  description: string | null;
  site_id: string;
  facility_id: string | null;
  initial_due_date: string;
  recurrence_pattern: "daily" | "weekly" | "monthly" | "custom";
  recurrence_interval_days: number | null;
  assignee_id: string | null;
  job_family_id: string | null;
  site_name?: string;
  facility_name?: string;
  assignee_name?: string;
  job_family_name?: string;
}

type SortField = "name" | "site_name" | "initial_due_date" | "recurrence_pattern" | "assignee_name";
type SortDirection = "asc" | "desc";

interface WorkflowTaskListProps {
  tasks: WorkflowTask[];
  sites: Site[];
  jobFamilies: JobFamily[];
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  onEdit: (task: WorkflowTask) => void;
  onDelete: (task: WorkflowTask) => void;
  onSave: (data: WorkflowFormValues, task?: WorkflowTask | null) => Promise<void>;
  onSaveMultiple: (data: CreateWorkflowFormValues) => Promise<void>;
  editingId: string | null;
  isAdding: boolean;
  onStartEdit: (task: WorkflowTask) => void;
  onCancelEdit: () => void;
  onStartAdd: () => void;
  onCancelAdd: () => void;
  saving: boolean;
}

const WorkflowTaskList = ({
  tasks,
  sites,
  jobFamilies,
  sortField,
  sortDirection,
  onSort,
  onDelete,
  onSave,
  onSaveMultiple,
  editingId,
  isAdding,
  onStartEdit,
  onCancelEdit,
  onStartAdd,
  onCancelAdd,
  saving,
}: WorkflowTaskListProps) => {
  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-6 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
      onClick={() => onSort(field)}
    >
      {children}
      <ArrowUpDown className="ml-1 h-3 w-3" />
    </Button>
  );

  const handleSaveEdit = async (data: WorkflowFormValues, task: WorkflowTask) => {
    await onSave(data, task);
  };

  const getAssigneeDisplay = (task: WorkflowTask) => {
    if (task.job_family_name) {
      return (
        <span className="flex items-center gap-1 text-primary">
          <Users className="h-3 w-3" />
          {task.job_family_name}
        </span>
      );
    }
    if (task.assignee_name) {
      return task.assignee_name;
    }
    return "-";
  };

  return (
    <div className="space-y-2">
      {/* Header row */}
      <div className="hidden md:grid md:grid-cols-[1fr_120px_120px_100px_100px_140px_80px] gap-2 px-3 py-2 text-xs text-muted-foreground border-b">
        <SortButton field="name">Task Name</SortButton>
        <SortButton field="site_name">Site</SortButton>
        <span className="px-2">Facility</span>
        <SortButton field="initial_due_date">Due Date</SortButton>
        <SortButton field="recurrence_pattern">Recurrence</SortButton>
        <SortButton field="assignee_name">Assigned To</SortButton>
        <span className="px-2">Actions</span>
      </div>

      {/* Task rows */}
      {tasks.length === 0 && !isAdding && (
        <div className="text-center py-8 text-muted-foreground">
          No workflow tasks found. Create your first task to get started.
        </div>
      )}

      {tasks.map((task) => (
        <div key={task.id}>
          {editingId === task.id ? (
            <WorkflowInlineTaskForm
              sites={sites}
              jobFamilies={jobFamilies}
              task={task}
              onSave={(data) => handleSaveEdit(data, task)}
              onCancel={onCancelEdit}
              saving={saving}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-[1fr_120px_120px_100px_100px_140px_80px] gap-2 px-3 py-3 border rounded-lg items-center hover:bg-muted/50 transition-colors">
              <div className="font-medium truncate">{task.name}</div>
              <div className="text-sm text-muted-foreground truncate">
                <span className="md:hidden text-xs font-medium mr-1">Site:</span>
                {task.site_name || "-"}
              </div>
              <div className="text-sm text-muted-foreground truncate">
                <span className="md:hidden text-xs font-medium mr-1">Facility:</span>
                {task.facility_name || "Whole site"}
              </div>
              <div className="text-sm">
                <span className="md:hidden text-xs font-medium text-muted-foreground mr-1">Due:</span>
                {format(new Date(task.initial_due_date), "dd MMM yyyy")}
              </div>
              <div className="text-sm">
                <span className="md:hidden text-xs font-medium text-muted-foreground mr-1">Recurrence:</span>
                <RecurrenceDisplay 
                  pattern={task.recurrence_pattern} 
                  intervalDays={task.recurrence_interval_days} 
                />
              </div>
              <div className="text-sm text-muted-foreground truncate">
                <span className="md:hidden text-xs font-medium mr-1">Assigned To:</span>
                {getAssigneeDisplay(task)}
              </div>
              <div className="flex gap-1 justify-end md:justify-start">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => onStartEdit(task)}
                  disabled={isAdding || editingId !== null}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => onDelete(task)}
                  disabled={isAdding || editingId !== null}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Inline add form */}
      {isAdding && (
        <WorkflowInlineTaskForm
          sites={sites}
          jobFamilies={jobFamilies}
          task={null}
          onSave={async () => {}}
          onSaveMultiple={onSaveMultiple}
          onCancel={onCancelAdd}
          saving={saving}
        />
      )}

      {/* Add button */}
      {!isAdding && editingId === null && (
        <Button
          variant="outline"
          className="w-full justify-start text-muted-foreground"
          onClick={onStartAdd}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add workflow task
        </Button>
      )}
    </div>
  );
};

export default WorkflowTaskList;
