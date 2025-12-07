import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Search, X, ArrowUpDown, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganisation } from "@/contexts/OrganisationContext";
import { calculateCurrentDueDate } from "@/lib/taskUtils";
import { format } from "date-fns";

interface TaskAuditRow {
  id: string;
  name: string;
  site_name: string;
  facility_name: string | null;
  assignee_name: string | null;
  creator_name: string | null;
  created_at: string;
  initial_due_date: string;
  recurrence_pattern: "daily" | "weekly" | "monthly" | "custom";
  recurrence_interval_days: number | null;
  current_due_date: Date;
  status: "completed" | "pending" | "overdue";
  completion_date: string | null;
  site_id: string;
  assignee_id: string | null;
}

interface Site {
  id: string;
  name: string;
}

interface Assignee {
  id: string;
  name: string;
}

type SortField = "name" | "site_name" | "assignee_name" | "current_due_date" | "status";
type SortDirection = "asc" | "desc";

const TaskAudit = () => {
  const { organisationId } = useOrganisation();
  
  const [tasks, setTasks] = useState<TaskAuditRow[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [siteFilter, setSiteFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // Sorting
  const [sortField, setSortField] = useState<SortField>("current_due_date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  useEffect(() => {
    const fetchData = async () => {
      if (!organisationId) return;
      
      setLoading(true);

      // Fetch workflow tasks with related data
      const { data: tasksData } = await supabase
        .from("workflow_tasks")
        .select(`
          id,
          name,
          site_id,
          facility_id,
          assignee_id,
          created_by,
          created_at,
          initial_due_date,
          recurrence_pattern,
          recurrence_interval_days,
          sites(name),
          facilities(name),
          assignee:profiles!workflow_tasks_assignee_id_fkey(first_name, last_name),
          creator:profiles!workflow_tasks_created_by_fkey(first_name, last_name)
        `)
        .eq("organisation_id", organisationId)
        .eq("is_active", true);

      // Fetch sites for filter dropdown
      const { data: sitesData } = await supabase
        .from("sites")
        .select("id, name")
        .eq("organisation_id", organisationId)
        .eq("is_active", true)
        .order("name");

      // Fetch profiles for assignee filter dropdown
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .eq("organisation_id", organisationId)
        .eq("is_active", true)
        .order("first_name");

      if (tasksData) {
        const taskIds = tasksData.map((t: any) => t.id);
        
        // Fetch completions for these tasks
        const { data: completionsData } = await supabase
          .from("task_completions")
          .select("workflow_task_id, due_date, completed_at")
          .in("workflow_task_id", taskIds);

        const completionsMap = new Map<string, { due_date: string; completed_at: string }>();
        completionsData?.forEach((c: any) => {
          const key = `${c.workflow_task_id}-${c.due_date}`;
          completionsMap.set(key, { due_date: c.due_date, completed_at: c.completed_at });
        });

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const formattedTasks: TaskAuditRow[] = tasksData.map((task: any) => {
          const currentDueDate = calculateCurrentDueDate(
            task.initial_due_date,
            task.recurrence_pattern,
            task.recurrence_interval_days
          );
          
          const dueDateStr = format(currentDueDate, "yyyy-MM-dd");
          const completionKey = `${task.id}-${dueDateStr}`;
          const completion = completionsMap.get(completionKey);

          let status: "completed" | "pending" | "overdue";
          let completionDate: string | null = null;

          if (completion) {
            status = "completed";
            completionDate = completion.completed_at;
          } else if (currentDueDate < today) {
            status = "overdue";
          } else {
            status = "pending";
          }

          const assignee = task.assignee as { first_name: string; last_name: string } | null;
          const creator = task.creator as { first_name: string; last_name: string } | null;

          return {
            id: task.id,
            name: task.name,
            site_name: task.sites?.name || "Unknown",
            facility_name: task.facilities?.name || null,
            assignee_name: assignee
              ? [assignee.first_name, assignee.last_name].filter(Boolean).join(" ")
              : null,
            creator_name: creator
              ? [creator.first_name, creator.last_name].filter(Boolean).join(" ")
              : null,
            created_at: task.created_at,
            initial_due_date: task.initial_due_date,
            recurrence_pattern: task.recurrence_pattern,
            recurrence_interval_days: task.recurrence_interval_days,
            current_due_date: currentDueDate,
            status,
            completion_date: completionDate,
            site_id: task.site_id,
            assignee_id: task.assignee_id,
          };
        });

        setTasks(formattedTasks);
      }

      if (sitesData) {
        setSites(sitesData);
      }

      if (profilesData) {
        setAssignees(
          profilesData.map((p: any) => ({
            id: p.id,
            name: [p.first_name, p.last_name].filter(Boolean).join(" "),
          }))
        );
      }

      setLoading(false);
    };

    fetchData();
  }, [organisationId]);

  // Filtered and sorted tasks
  const filteredAndSortedTasks = useMemo(() => {
    let result = [...tasks];

    // Apply filters
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((t) => t.name.toLowerCase().includes(query));
    }

    if (siteFilter !== "all") {
      result = result.filter((t) => t.site_id === siteFilter);
    }

    if (assigneeFilter !== "all") {
      if (assigneeFilter === "unassigned") {
        result = result.filter((t) => !t.assignee_id);
      } else {
        result = result.filter((t) => t.assignee_id === assigneeFilter);
      }
    }

    if (statusFilter !== "all") {
      result = result.filter((t) => t.status === statusFilter);
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "site_name":
          comparison = a.site_name.localeCompare(b.site_name);
          break;
        case "assignee_name":
          comparison = (a.assignee_name || "").localeCompare(b.assignee_name || "");
          break;
        case "current_due_date":
          comparison = a.current_due_date.getTime() - b.current_due_date.getTime();
          break;
        case "status":
          const statusOrder = { overdue: 0, pending: 1, completed: 2 };
          comparison = statusOrder[a.status] - statusOrder[b.status];
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [tasks, searchQuery, siteFilter, assigneeFilter, statusFilter, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setSiteFilter("all");
    setAssigneeFilter("all");
    setStatusFilter("all");
  };

  const hasActiveFilters = searchQuery || siteFilter !== "all" || assigneeFilter !== "all" || statusFilter !== "all";

  const getStatusBadge = (status: "completed" | "pending" | "overdue", completionDate: string | null, dueDate: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    switch (status) {
      case "completed":
        return (
          <Badge variant="default" className="bg-green-600 hover:bg-green-700">
            Completed {completionDate ? format(new Date(completionDate), "dd/MM/yy") : ""}
          </Badge>
        );
      case "overdue":
        const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        return (
          <Badge variant="destructive">
            Overdue by {daysOverdue} day{daysOverdue !== 1 ? "s" : ""}
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-200">
            Pending
          </Badge>
        );
    }
  };

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead
      className="cursor-pointer hover:bg-muted/50 select-none"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        <ArrowUpDown className="h-3 w-3 opacity-50" />
      </div>
    </TableHead>
  );

  if (loading) {
    return (
      <Card className="animate-fade-in">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            <CardTitle>Task Audit</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          <div>
            <CardTitle>Task Audit</CardTitle>
            <CardDescription>
              Track and audit all workflow tasks across your organisation
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={siteFilter} onValueChange={setSiteFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Sites" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sites</SelectItem>
              {sites.map((site) => (
                <SelectItem key={site.id} value={site.id}>
                  {site.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Assignees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assignees</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {assignees.map((assignee) => (
                <SelectItem key={assignee.id} value={assignee.id}>
                  {assignee.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={handleClearFilters}>
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader field="name">Task Name</SortableHeader>
                <SortableHeader field="site_name">Site</SortableHeader>
                <TableHead>Facility</TableHead>
                <TableHead>Assigned By</TableHead>
                <SortableHeader field="assignee_name">Assignee</SortableHeader>
                <TableHead>Assigned Date</TableHead>
                <SortableHeader field="current_due_date">Due Date</SortableHeader>
                <SortableHeader field="status">Status</SortableHeader>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedTasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {hasActiveFilters ? "No tasks match your filters." : "No workflow tasks found."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedTasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">{task.name}</TableCell>
                    <TableCell>{task.site_name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {task.facility_name || "Whole Site"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {task.creator_name || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {task.assignee_name || "Unassigned"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(task.created_at), "dd/MM/yy")}
                    </TableCell>
                    <TableCell>
                      {format(task.current_due_date, "dd/MM/yy")}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(task.status, task.completion_date, task.current_due_date)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Summary */}
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>Total: {filteredAndSortedTasks.length}</span>
          <span>Completed: {filteredAndSortedTasks.filter((t) => t.status === "completed").length}</span>
          <span>Pending: {filteredAndSortedTasks.filter((t) => t.status === "pending").length}</span>
          <span className="text-destructive">
            Overdue: {filteredAndSortedTasks.filter((t) => t.status === "overdue").length}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default TaskAudit;
