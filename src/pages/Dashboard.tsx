import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Copy, Check, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import TaskWidget from "@/components/dashboard/TaskWidget";
import TaskDetailSheet from "@/components/dashboard/TaskDetailSheet";
import { MyShiftsWidget } from "@/components/dashboard/MyShiftsWidget";
import { FullRotaWidget } from "@/components/dashboard/FullRotaWidget";
import { PatientCapacityWidget } from "@/components/dashboard/PatientCapacityWidget";
import { YourDayCard } from "@/components/dashboard/YourDayCard";
import { WorkflowTaskWithDetails, TaskWithDueDate, enrichTaskWithDueDate } from "@/lib/taskUtils";
import { format, subDays, addDays } from "date-fns";

interface InviteCodeInfo {
  code: string;
  usedCount: number;
  maxUses: number;
}

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [inviteCode, setInviteCode] = useState<InviteCodeInfo | null>(null);
  const [copied, setCopied] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Task state
  const [myTasks, setMyTasks] = useState<TaskWithDueDate[]>([]);
  const [jobFamilyTasks, setJobFamilyTasks] = useState<TaskWithDueDate[]>([]);
  const [selectedTask, setSelectedTask] = useState<TaskWithDueDate | null>(null);
  const [taskSheetOpen, setTaskSheetOpen] = useState(false);

  const fetchTasks = useCallback(async (userId: string, primarySiteId: string | null, userJobFamilyId: string | null) => {
    try {
      const taskSelectFields = `
        id,
        name,
        description,
        site_id,
        facility_id,
        assignee_id,
        job_family_id,
        initial_due_date,
        recurrence_pattern,
        recurrence_interval_days,
        is_active,
        organisation_id,
        sites!inner(name),
        facilities(name),
        profiles!workflow_tasks_assignee_id_fkey(first_name, last_name),
        job_families(name)
      `;

      // Fetch tasks assigned directly to me (personal assignments only)
      const { data: myTasksData, error: myError } = await supabase
        .from("workflow_tasks")
        .select(taskSelectFields)
        .eq("is_active", true)
        .eq("assignee_id", userId);

      if (myError) throw myError;

      // Fetch job family tasks at my site (separate query)
      let jobFamilyTasksData: any[] = [];
      if (userJobFamilyId && primarySiteId) {
        const { data, error: jfError } = await supabase
          .from("workflow_tasks")
          .select(taskSelectFields)
          .eq("is_active", true)
          .eq("job_family_id", userJobFamilyId)
          .eq("site_id", primarySiteId)
          .is("assignee_id", null); // Only job family assignments, not individual

        if (jfError) throw jfError;
        jobFamilyTasksData = data || [];
      }

      // Get all task IDs to check for recent completions
      const allTaskIds = [
        ...(myTasksData || []).map(t => t.id),
        ...jobFamilyTasksData.map(t => t.id)
      ];

      // Fetch recent completions to filter out completed tasks
      const { data: completions } = await supabase
        .from("task_completions")
        .select("workflow_task_id, due_date")
        .in("workflow_task_id", allTaskIds.length > 0 ? allTaskIds : ['00000000-0000-0000-0000-000000000000']);

      const completedTaskDates = new Set(
        (completions || []).map(c => `${c.workflow_task_id}-${c.due_date}`)
      );

      // Transform and enrich tasks
      const transformTask = (task: any, isJobFamilyAssignment: boolean = false): WorkflowTaskWithDetails => ({
        id: task.id,
        name: task.name,
        description: task.description,
        site_id: task.site_id,
        site_name: task.sites?.name,
        facility_id: task.facility_id,
        facility_name: task.facilities?.name,
        assignee_id: task.assignee_id,
        assignee_name: task.profiles 
          ? `${task.profiles.first_name || ""} ${task.profiles.last_name || ""}`.trim()
          : null,
        job_family_id: task.job_family_id,
        job_family_name: task.job_families?.name,
        initial_due_date: task.initial_due_date,
        recurrence_pattern: task.recurrence_pattern,
        recurrence_interval_days: task.recurrence_interval_days,
        is_active: task.is_active,
        organisation_id: task.organisation_id,
        isJobFamilyAssignment
      });

      const filterCompletedTasks = (tasks: TaskWithDueDate[]): TaskWithDueDate[] => {
        return tasks.filter(task => {
          const dueDateStr = format(task.currentDueDate, "yyyy-MM-dd");
          return !completedTaskDates.has(`${task.id}-${dueDateStr}`);
        });
      };

      // Sort by due date (overdue first, then by date)
      const sortTasks = (tasks: TaskWithDueDate[]): TaskWithDueDate[] => {
        return tasks.sort((a, b) => {
          // Overdue tasks first
          if (a.isOverdue && !b.isOverdue) return -1;
          if (!a.isOverdue && b.isOverdue) return 1;
          // Then by due date
          return a.currentDueDate.getTime() - b.currentDueDate.getTime();
        });
      };

      const enrichedMyTasks = (myTasksData || [])
        .map(t => transformTask(t, false))
        .map(enrichTaskWithDueDate);
      
      const enrichedJobFamilyTasks = jobFamilyTasksData
        .map(t => transformTask(t, true))
        .map(enrichTaskWithDueDate);

      setMyTasks(sortTasks(filterCompletedTasks(enrichedMyTasks)));
      setJobFamilyTasks(sortTasks(filterCompletedTasks(enrichedJobFamilyTasks)));
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("organisation_id, primary_site_id, job_title_id")
        .eq("id", session.user.id)
        .maybeSingle();

      // Get user's job family through their job title
      let userJobFamilyId: string | null = null;
      if (profile?.job_title_id) {
        const { data: jobTitle } = await supabase
          .from("job_titles")
          .select("job_family_id")
          .eq("id", profile.job_title_id)
          .maybeSingle();
        
        userJobFamilyId = jobTitle?.job_family_id || null;
      }

      if (profile?.organisation_id) {
        // Check if user is admin
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .maybeSingle();

        const userIsAdmin = roleData?.role === "admin" || roleData?.role === "master";
        setIsAdmin(userIsAdmin);

        // Fetch invitation code for admins
        if (userIsAdmin) {
          const { data: codeData } = await supabase
            .from("invitation_codes")
            .select("code, used_count, max_uses")
            .eq("organisation_id", profile.organisation_id)
            .is("email", null)
            .eq("is_active", true)
            .maybeSingle();

          if (codeData) {
            setInviteCode({
              code: codeData.code,
              usedCount: codeData.used_count,
              maxUses: codeData.max_uses,
            });
          }
        }

        // Fetch tasks
        await fetchTasks(session.user.id, profile.primary_site_id, userJobFamilyId);
      }

      setUserName(session.user.user_metadata?.first_name || "there");
      setLoading(false);
    };
    init();
  }, [fetchTasks]);

  const handleCopy = async () => {
    if (!inviteCode) return;
    await navigator.clipboard.writeText(inviteCode.code);
    setCopied(true);
    toast.success("Code copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTaskClick = (task: TaskWithDueDate) => {
    setSelectedTask(task);
    setTaskSheetOpen(true);
  };

  const handleTaskCompleted = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    const { data: profile } = await supabase
      .from("profiles")
      .select("primary_site_id, job_title_id")
      .eq("id", session.user.id)
      .maybeSingle();
    
    // Get user's job family through their job title
    let userJobFamilyId: string | null = null;
    if (profile?.job_title_id) {
      const { data: jobTitle } = await supabase
        .from("job_titles")
        .select("job_family_id")
        .eq("id", profile.job_title_id)
        .maybeSingle();
      
      userJobFamilyId = jobTitle?.job_family_id || null;
    }
    
    await fetchTasks(session.user.id, profile?.primary_site_id || null, userJobFamilyId);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container py-12">
      <div className="mb-8 animate-fade-in">
        <h1 className="text-3xl font-bold mb-2">Welcome, {userName}!</h1>
        <p className="text-muted-foreground">Here's an overview of your clinic setup.</p>
      </div>

      {/* Your Day Headline Card */}
      <YourDayCard todayTasks={[...myTasks.filter(t => t.isToday), ...jobFamilyTasks.filter(t => t.isToday)]} />

      {/* Invitation Code Card for Admins */}
      {isAdmin && inviteCode && (
        <Card className="mb-6 animate-fade-in border-primary/20 bg-primary/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              <CardTitle className="text-base font-medium">Team Invitation Code</CardTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="gap-2"
            >
              {copied ? (
                <Check className="h-4 w-4 text-success" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copied ? "Copied" : "Copy"}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <code className="text-xl font-mono font-bold tracking-wider">{inviteCode.code}</code>
              <span className="text-sm text-muted-foreground">
                {inviteCode.usedCount} / {inviteCode.maxUses} uses
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Share this code with team members so they can join your organisation.
            </p>
          </CardContent>
        </Card>
      )}

      {/* My Upcoming Shifts */}
      <MyShiftsWidget />

      {/* Full Rota View */}
      <FullRotaWidget />

      {/* Patient Capacity Overview */}
      <PatientCapacityWidget />

      {/* Task Widgets */}
      <div className="grid gap-6 md:grid-cols-2 animate-fade-in">
        <TaskWidget
          title="Tasks Assigned to Me"
          tasks={myTasks}
          onTaskClick={handleTaskClick}
          variant="personal"
        />
        <TaskWidget
          title="Tasks assigned to my job family"
          tasks={jobFamilyTasks}
          onTaskClick={handleTaskClick}
          variant="jobfamily"
        />
      </div>

      {/* Task Detail Sheet */}
      <TaskDetailSheet
        task={selectedTask}
        open={taskSheetOpen}
        onOpenChange={setTaskSheetOpen}
        onTaskCompleted={handleTaskCompleted}
      />
    </div>
  );
};

export default Dashboard;
