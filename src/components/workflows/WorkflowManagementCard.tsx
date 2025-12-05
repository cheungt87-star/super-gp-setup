import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, GitBranch, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganisation } from "@/contexts/OrganisationContext";
import { toast } from "@/hooks/use-toast";
import WorkflowTaskFilters from "./WorkflowTaskFilters";
import WorkflowTaskList from "./WorkflowTaskList";
import WorkflowTaskForm, { WHOLE_SITE_VALUE, UNASSIGNED_VALUE } from "./WorkflowTaskForm";

interface Site {
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
  site_name?: string;
  facility_name?: string;
  assignee_name?: string;
}

type SortField = "name" | "site_name" | "initial_due_date" | "recurrence_pattern" | "assignee_name";
type SortDirection = "asc" | "desc";

const WorkflowManagementCard = () => {
  const { organisationId } = useOrganisation();
  
  // Data state
  const [tasks, setTasks] = useState<WorkflowTask[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  
  // Filter state
  const [siteFilter, setSiteFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Sort state
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  
  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<WorkflowTask | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Delete state
  const [taskToDelete, setTaskToDelete] = useState<WorkflowTask | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async (isRefetch = false) => {
    if (!organisationId) return;
    
    if (!isRefetch) setInitialLoading(true);

    const [tasksResult, sitesResult] = await Promise.all([
      supabase
        .from("workflow_tasks")
        .select(`
          id,
          name,
          description,
          site_id,
          facility_id,
          initial_due_date,
          recurrence_pattern,
          recurrence_interval_days,
          assignee_id,
          sites!inner(name),
          facilities(name),
          profiles(first_name, last_name)
        `)
        .eq("organisation_id", organisationId)
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("sites")
        .select("id, name")
        .eq("organisation_id", organisationId)
        .eq("is_active", true)
        .order("name"),
    ]);

    if (tasksResult.data) {
      const formattedTasks: WorkflowTask[] = tasksResult.data.map((task: any) => ({
        id: task.id,
        name: task.name,
        description: task.description,
        site_id: task.site_id,
        facility_id: task.facility_id,
        initial_due_date: task.initial_due_date,
        recurrence_pattern: task.recurrence_pattern,
        recurrence_interval_days: task.recurrence_interval_days,
        assignee_id: task.assignee_id,
        site_name: task.sites?.name,
        facility_name: task.facilities?.name,
        assignee_name: task.profiles
          ? [task.profiles.first_name, task.profiles.last_name].filter(Boolean).join(" ")
          : undefined,
      }));
      setTasks(formattedTasks);
    }

    if (sitesResult.data) {
      setSites(sitesResult.data);
    }

    setInitialLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [organisationId]);

  // Filter and sort tasks
  const filteredAndSortedTasks = useMemo(() => {
    let result = [...tasks];

    // Apply site filter
    if (siteFilter !== "all") {
      result = result.filter((task) => task.site_id === siteFilter);
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((task) => task.name.toLowerCase().includes(query));
    }

    // Apply sorting
    result.sort((a, b) => {
      let aValue: string | number = a[sortField] || "";
      let bValue: string | number = b[sortField] || "";

      if (sortField === "initial_due_date") {
        return sortDirection === "asc"
          ? new Date(a.initial_due_date).getTime() - new Date(b.initial_due_date).getTime()
          : new Date(b.initial_due_date).getTime() - new Date(a.initial_due_date).getTime();
      }

      if (typeof aValue === "string") aValue = aValue.toLowerCase();
      if (typeof bValue === "string") bValue = bValue.toLowerCase();

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [tasks, siteFilter, searchQuery, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleClearFilters = () => {
    setSiteFilter("all");
    setSearchQuery("");
  };

  const handleEdit = (task: WorkflowTask) => {
    setSelectedTask(task);
    setFormOpen(true);
  };

  const handleDelete = (task: WorkflowTask) => {
    setTaskToDelete(task);
  };

  const handleAddNew = () => {
    setSelectedTask(null);
    setFormOpen(true);
  };

  const handleSave = async (data: any) => {
    if (!organisationId) return;
    
    setSaving(true);

    try {
      const taskData = {
        organisation_id: organisationId,
        name: data.name,
        description: data.description || null,
        site_id: data.site_id,
        facility_id: data.facility_id === WHOLE_SITE_VALUE ? null : (data.facility_id || null),
        initial_due_date: data.initial_due_date.toISOString().split("T")[0],
        recurrence_pattern: data.recurrence_pattern,
        recurrence_interval_days: data.recurrence_pattern === "custom" ? data.recurrence_interval_days : null,
        assignee_id: data.assignee_id === UNASSIGNED_VALUE ? null : (data.assignee_id || null),
      };

      if (selectedTask) {
        const { error } = await supabase
          .from("workflow_tasks")
          .update(taskData)
          .eq("id", selectedTask.id);

        if (error) throw error;

        toast({
          title: "Task updated",
          description: `${data.name} has been updated successfully.`,
        });
      } else {
        const { error } = await supabase
          .from("workflow_tasks")
          .insert(taskData);

        if (error) throw error;

        toast({
          title: "Task created",
          description: `${data.name} has been created successfully.`,
        });
      }

      setFormOpen(false);
      setSelectedTask(null);
      fetchData(true);
    } catch (error: any) {
      toast({
        title: "Error saving task",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!taskToDelete) return;
    
    setDeleting(true);

    const { error } = await supabase
      .from("workflow_tasks")
      .update({ is_active: false })
      .eq("id", taskToDelete.id);

    if (error) {
      toast({
        title: "Error deleting task",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Task deleted",
        description: `${taskToDelete.name} has been removed.`,
      });
      fetchData(true);
    }

    setDeleting(false);
    setTaskToDelete(null);
  };

  if (initialLoading) {
    return (
      <Card className="animate-fade-in">
        <CardHeader>
          <div className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            <CardTitle>Workflow Tasks</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="animate-fade-in">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              <div>
                <CardTitle>Workflow Tasks</CardTitle>
                <CardDescription>
                  {tasks.length} workflow task{tasks.length !== 1 ? "s" : ""} configured
                </CardDescription>
              </div>
            </div>
            <Button onClick={handleAddNew}>
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <WorkflowTaskFilters
            sites={sites}
            siteFilter={siteFilter}
            searchQuery={searchQuery}
            onSiteFilterChange={setSiteFilter}
            onSearchQueryChange={setSearchQuery}
            onClearFilters={handleClearFilters}
          />
          
          <WorkflowTaskList
            tasks={filteredAndSortedTasks}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </CardContent>
      </Card>

      <WorkflowTaskForm
        open={formOpen}
        onOpenChange={setFormOpen}
        sites={sites}
        task={selectedTask}
        onSave={handleSave}
        saving={saving}
      />

      <AlertDialog open={!!taskToDelete} onOpenChange={() => setTaskToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workflow Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{taskToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default WorkflowManagementCard;
