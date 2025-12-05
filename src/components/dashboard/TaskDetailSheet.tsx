import { useState } from "react";
import { format } from "date-fns";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, MapPin, Building, User, Calendar, RotateCw, Loader2 } from "lucide-react";
import { TaskWithDueDate, formatEta } from "@/lib/taskUtils";
import RecurrenceDisplay from "@/components/workflows/RecurrenceDisplay";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TaskDetailSheetProps {
  task: TaskWithDueDate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskCompleted: () => void;
}

const TaskDetailSheet = ({ task, open, onOpenChange, onTaskCompleted }: TaskDetailSheetProps) => {
  const [declarationConfirmed, setDeclarationConfirmed] = useState(false);
  const [comments, setComments] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleComplete = async () => {
    if (!task || !declarationConfirmed) return;

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("task_completions").insert({
        workflow_task_id: task.id,
        completed_by: user.id,
        due_date: format(task.currentDueDate, "yyyy-MM-dd"),
        comments: comments.trim() || null,
        declaration_confirmed: declarationConfirmed,
        organisation_id: task.organisation_id
      });

      if (error) throw error;

      toast.success("Task completed successfully");
      onOpenChange(false);
      onTaskCompleted();
      
      // Reset form
      setDeclarationConfirmed(false);
      setComments("");
    } catch (error: any) {
      console.error("Error completing task:", error);
      toast.error(error.message || "Failed to complete task");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset form when closing
      setDeclarationConfirmed(false);
      setComments("");
    }
    onOpenChange(newOpen);
  };

  if (!task) return null;

  const etaText = formatEta(task.eta, task.isOverdue, task.isToday);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-left pr-8">{task.name}</SheetTitle>
          <SheetDescription className="text-left">
            Complete this task and add any relevant comments.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Task Details */}
          <div className="space-y-4">
            {task.description && (
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Description</Label>
                <p className="mt-1 text-sm">{task.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <Label className="text-xs text-muted-foreground">Site</Label>
                  <p className="text-sm">{task.site_name || "Unknown"}</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Building className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <Label className="text-xs text-muted-foreground">Facility</Label>
                  <p className="text-sm">{task.facility_name || "Whole site"}</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <Label className="text-xs text-muted-foreground">Assignee</Label>
                  <p className="text-sm">{task.assignee_name || "Unassigned"}</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <RotateCw className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <Label className="text-xs text-muted-foreground">Recurrence</Label>
                  <div className="text-sm">
                    <RecurrenceDisplay
                      pattern={task.recurrence_pattern}
                      intervalDays={task.recurrence_interval_days}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {format(task.currentDueDate, "EEEE, MMMM d, yyyy")}
                </p>
              </div>
              <Badge
                variant={task.isOverdue ? "destructive" : task.isToday ? "default" : "secondary"}
              >
                {etaText}
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Completion Form */}
          <div className="space-y-4">
            <div className="flex items-start space-x-3 p-3 rounded-lg border">
              <Checkbox
                id="declaration"
                checked={declarationConfirmed}
                onCheckedChange={(checked) => setDeclarationConfirmed(checked === true)}
              />
              <Label
                htmlFor="declaration"
                className="text-sm leading-relaxed cursor-pointer"
              >
                I declare that I have completed this task correctly and in accordance with the required standards.
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="comments">Comments (optional)</Label>
              <Textarea
                id="comments"
                placeholder="Add any notes or observations about this task..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              disabled={!declarationConfirmed || isSubmitting}
              onClick={handleComplete}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Completing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Complete Task
                </>
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default TaskDetailSheet;
