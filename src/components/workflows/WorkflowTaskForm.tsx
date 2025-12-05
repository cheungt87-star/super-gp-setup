import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

// Sentinel values for optional select fields (Radix UI doesn't support empty string values)
export const WHOLE_SITE_VALUE = "__whole_site__";
export const UNASSIGNED_VALUE = "__unassigned__";

const formSchema = z.object({
  name: z.string().min(1, "Task name is required").max(200),
  description: z.string().max(1000).optional(),
  site_id: z.string().min(1, "Site is required"),
  facility_id: z.string().optional(),
  initial_due_date: z.date({ required_error: "Due date is required" }),
  recurrence_pattern: z.enum(["daily", "weekly", "monthly", "custom"]),
  recurrence_interval_days: z.number().min(1).optional(),
  assignee_id: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface Site {
  id: string;
  name: string;
}

interface Facility {
  id: string;
  name: string;
}

interface User {
  id: string;
  first_name: string | null;
  last_name: string | null;
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
}

interface WorkflowTaskFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sites: Site[];
  task?: WorkflowTask | null;
  onSave: (data: FormValues) => Promise<void>;
  saving: boolean;
}

const WorkflowTaskForm = ({
  open,
  onOpenChange,
  sites,
  task,
  onSave,
  saving,
}: WorkflowTaskFormProps) => {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      site_id: "",
      facility_id: WHOLE_SITE_VALUE,
      recurrence_pattern: "daily",
      recurrence_interval_days: 1,
      assignee_id: UNASSIGNED_VALUE,
    },
  });

  const selectedSiteId = form.watch("site_id");
  const recurrencePattern = form.watch("recurrence_pattern");

  // Reset form when dialog opens/closes or task changes
  useEffect(() => {
    if (open) {
      if (task) {
        form.reset({
          name: task.name,
          description: task.description || "",
          site_id: task.site_id,
          facility_id: task.facility_id || WHOLE_SITE_VALUE,
          initial_due_date: new Date(task.initial_due_date),
          recurrence_pattern: task.recurrence_pattern,
          recurrence_interval_days: task.recurrence_interval_days || 1,
          assignee_id: task.assignee_id || UNASSIGNED_VALUE,
        });
      } else {
        form.reset({
          name: "",
          description: "",
          site_id: "",
          facility_id: WHOLE_SITE_VALUE,
          recurrence_pattern: "daily",
          recurrence_interval_days: 1,
          assignee_id: UNASSIGNED_VALUE,
        });
      }
    }
  }, [open, task, form]);

  // Fetch facilities and users when site changes
  useEffect(() => {
    const fetchSiteOptions = async () => {
      if (!selectedSiteId) {
        setFacilities([]);
        setUsers([]);
        return;
      }

      setLoadingOptions(true);

      const [facilitiesResult, usersResult] = await Promise.all([
        supabase
          .from("facilities")
          .select("id, name")
          .eq("site_id", selectedSiteId)
          .eq("is_active", true)
          .order("name"),
        supabase
          .from("profiles")
          .select("id, first_name, last_name")
          .eq("primary_site_id", selectedSiteId)
          .eq("is_active", true)
          .order("first_name"),
      ]);

      if (facilitiesResult.data) {
        setFacilities(facilitiesResult.data);
      }

      if (usersResult.data) {
        setUsers(usersResult.data);
      }

      setLoadingOptions(false);
    };

    fetchSiteOptions();
  }, [selectedSiteId]);

  // Clear dependent fields when site changes (but not on initial load)
  const handleSiteChange = (value: string) => {
    form.setValue("site_id", value);
    if (!task || task.site_id !== value) {
      form.setValue("facility_id", WHOLE_SITE_VALUE);
      form.setValue("assignee_id", UNASSIGNED_VALUE);
    }
  };

  const handleSubmit = async (data: FormValues) => {
    await onSave(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{task ? "Edit Workflow Task" : "Add Workflow Task"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Check vaccine fridge temperature" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="e.g. Temperature must be between 2-8°C" 
                      className="resize-none"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="site_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Site *</FormLabel>
                    <Select value={field.value} onValueChange={handleSiteChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select site" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {sites.map((site) => (
                          <SelectItem key={site.id} value={site.id}>
                            {site.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="facility_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Facility</FormLabel>
                    <Select 
                      value={field.value} 
                      onValueChange={field.onChange}
                      disabled={!selectedSiteId || loadingOptions}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Whole site" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={WHOLE_SITE_VALUE}>Whole site</SelectItem>
                        {facilities.map((facility) => (
                          <SelectItem key={facility.id} value={facility.id}>
                            {facility.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="initial_due_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Initial Due Date *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? format(field.value, "PPP") : "Pick a date"}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="recurrence_pattern"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recurrence *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {recurrencePattern === "custom" && (
              <FormField
                control={form.control}
                name="recurrence_interval_days"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custom Interval (days)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={1}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="assignee_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assignee</FormLabel>
                  <Select 
                    value={field.value} 
                    onValueChange={field.onChange}
                    disabled={!selectedSiteId || loadingOptions}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select assignee" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={UNASSIGNED_VALUE}>Unassigned</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {[user.first_name, user.last_name].filter(Boolean).join(" ") || "Unnamed User"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedSiteId && users.length === 0 && !loadingOptions && (
                    <p className="text-xs text-muted-foreground">
                      No users assigned to this site
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : task ? "Save Changes" : "Create Task"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default WorkflowTaskForm;
