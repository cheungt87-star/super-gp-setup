import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, ArrowUpDown } from "lucide-react";
import { format } from "date-fns";
import RecurrenceDisplay from "./RecurrenceDisplay";

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
  site_name?: string;
  facility_name?: string;
  assignee_name?: string;
}

type SortField = "name" | "site_name" | "initial_due_date" | "recurrence_pattern" | "assignee_name";
type SortDirection = "asc" | "desc";

interface WorkflowTaskListProps {
  tasks: WorkflowTask[];
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  onEdit: (task: WorkflowTask) => void;
  onDelete: (task: WorkflowTask) => void;
}

const WorkflowTaskList = ({
  tasks,
  sortField,
  sortDirection,
  onSort,
  onEdit,
  onDelete,
}: WorkflowTaskListProps) => {
  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead>
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8 data-[state=open]:bg-accent"
        onClick={() => onSort(field)}
      >
        {children}
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    </TableHead>
  );

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No workflow tasks found. Create your first task to get started.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortableHeader field="name">Task Name</SortableHeader>
          <SortableHeader field="site_name">Site</SortableHeader>
          <TableHead>Facility</TableHead>
          <SortableHeader field="initial_due_date">Due Date</SortableHeader>
          <SortableHeader field="recurrence_pattern">Recurrence</SortableHeader>
          <SortableHeader field="assignee_name">Assignee</SortableHeader>
          <TableHead className="w-[100px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tasks.map((task) => (
          <TableRow key={task.id}>
            <TableCell className="font-medium">{task.name}</TableCell>
            <TableCell>{task.site_name || "-"}</TableCell>
            <TableCell>{task.facility_name || "Whole site"}</TableCell>
            <TableCell>{format(new Date(task.initial_due_date), "dd MMM yyyy")}</TableCell>
            <TableCell>
              <RecurrenceDisplay 
                pattern={task.recurrence_pattern} 
                intervalDays={task.recurrence_interval_days} 
              />
            </TableCell>
            <TableCell>{task.assignee_name || "-"}</TableCell>
            <TableCell>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => onEdit(task)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onDelete(task)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default WorkflowTaskList;
