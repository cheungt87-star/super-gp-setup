import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Check, X } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

// Sentinel values for optional select fields (Radix UI doesn't support empty string values)
export const WHOLE_SITE_VALUE = "__whole_site__";
export const UNASSIGNED_VALUE = "__unassigned__";

// Schema for editing existing tasks (single site)
const editFormSchema = z.object({
  name: z.string().min(1, "Task name is required").max(200),
  description: z.string().max(1000).optional(),
  site_id: z.string().min(1, "Site is required"),
  facility_id: z.string().optional(),
  initial_due_date: z.date({ required_error: "Due date is required" }),
  recurrence_pattern: z.enum(["daily", "weekly", "monthly", "custom"]),
  recurrence_interval_days: z.number().min(1).optional(),
  assignment_type: z.enum(["individual", "job_family"]),
  assignee_id: z.string().optional(),
  job_family_id: z.string().optional(),
});

// Schema for creating new tasks (multi-site)
const createFormSchema = z.object({
  name: z.string().min(1, "Task name is required").max(200),
  description: z.string().max(1000).optional(),
  site_ids: z.array(z.string()).min(1, "At least one site is required"),
  facility_id: z.string().optional(),
  initial_due_date: z.date({ required_error: "Due date is required" }),
  recurrence_pattern: z.enum(["daily", "weekly", "monthly", "custom"]),
  recurrence_interval_days: z.number().min(1).optional(),
  assignment_type: z.enum(["individual", "job_family"]),
  assignee_id: z.string().optional(),
  job_family_id: z.string().optional(),
});

export type WorkflowFormValues = z.infer<typeof editFormSchema>;
export type CreateWorkflowFormValues = z.infer<typeof createFormSchema>;

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
}

interface WorkflowInlineTaskFormProps {
  sites: Site[];
  jobFamilies: JobFamily[];
  task?: WorkflowTask | null;
  onSave: (data: WorkflowFormValues) => Promise<void>;
  onSaveMultiple?: (data: CreateWorkflowFormValues) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}

const WorkflowInlineTaskForm = ({
  sites,
  jobFamilies,
  task,
  onSave,
  onSaveMultiple,
  onCancel,
  saving,
}: WorkflowInlineTaskFormProps) => {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const isEditMode = !!task;

  // Determine initial assignment type based on existing task
  const getInitialAssignmentType = () => {
    if (task?.job_family_id) return "job_family";
    return "individual";
  };

  // Form for editing existing tasks (single site)
  const editForm = useForm<WorkflowFormValues>({
    resolver: zodResolver(editFormSchema),
    defaultValues: {
      name: task?.name || "",
      description: task?.description || "",
      site_id: task?.site_id || "",
      facility_id: task?.facility_id || WHOLE_SITE_VALUE,
      initial_due_date: task ? new Date(task.initial_due_date) : undefined,
      recurrence_pattern: task?.recurrence_pattern || "daily",
      recurrence_interval_days: task?.recurrence_interval_days || 1,
      assignment_type: getInitialAssignmentType(),
      assignee_id: task?.assignee_id || UNASSIGNED_VALUE,
      job_family_id: task?.job_family_id || UNASSIGNED_VALUE,
    },
  });

  // Form for creating new tasks (multi-site)
  const createForm = useForm<CreateWorkflowFormValues>({
    resolver: zodResolver(createFormSchema),
    defaultValues: {
      name: "",
      description: "",
      site_ids: [],
      facility_id: WHOLE_SITE_VALUE,
      initial_due_date: undefined,
      recurrence_pattern: "daily",
      recurrence_interval_days: 1,
      assignment_type: "individual",
      assignee_id: UNASSIGNED_VALUE,
      job_family_id: UNASSIGNED_VALUE,
    },
  });

  const selectedSiteId = editForm.watch("site_id");
  const selectedSiteIds = createForm.watch("site_ids");
  const editRecurrencePattern = editForm.watch("recurrence_pattern");
  const createRecurrencePattern = createForm.watch("recurrence_pattern");
  const editAssignmentType = editForm.watch("assignment_type");
  const createAssignmentType = createForm.watch("assignment_type");
  const isMultipleSitesSelected = !isEditMode && selectedSiteIds.length > 1;

  // Focus name input on mount
  useEffect(() => {
    setTimeout(() => nameInputRef.current?.focus(), 0);
  }, []);

  // Fetch facilities and users when site changes (edit mode only)
  useEffect(() => {
    const fetchSiteOptions = async () => {
      if (!selectedSiteId || !isEditMode) {
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
  }, [selectedSiteId, isEditMode]);

  const handleSiteChange = (value: string) => {
    editForm.setValue("site_id", value);
    if (!task || task.site_id !== value) {
      editForm.setValue("facility_id", WHOLE_SITE_VALUE);
      editForm.setValue("assignee_id", UNASSIGNED_VALUE);
    }
  };

  const handleSiteToggle = (siteId: string, checked: boolean) => {
    const current = createForm.getValues("site_ids");
    if (checked) {
      createForm.setValue("site_ids", [...current, siteId], { shouldValidate: true });
    } else {
      createForm.setValue("site_ids", current.filter(id => id !== siteId), { shouldValidate: true });
    }
    createForm.setValue("facility_id", WHOLE_SITE_VALUE);
    createForm.setValue("assignee_id", UNASSIGNED_VALUE);
  };

  const handleAllSitesToggle = (checked: boolean) => {
    if (checked) {
      createForm.setValue("site_ids", sites.map(s => s.id), { shouldValidate: true });
    } else {
      createForm.setValue("site_ids", [], { shouldValidate: true });
    }
    createForm.setValue("facility_id", WHOLE_SITE_VALUE);
    createForm.setValue("assignee_id", UNASSIGNED_VALUE);
  };

  const allSitesSelected = sites.length > 0 && selectedSiteIds.length === sites.length;

  const handleEditSubmit = async (data: WorkflowFormValues) => {
    await onSave(data);
  };

  const handleCreateSubmit = async (data: CreateWorkflowFormValues) => {
    if (onSaveMultiple) {
      await onSaveMultiple(data);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  };

  // Shared form fields JSX
  const renderFormFields = (
    formControl: any,
    recurrencePattern: string,
    assignmentType: string,
    isCreate: boolean
  ) => (
    <>
      <FormField
        control={formControl}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea 
                placeholder="e.g. Temperature must be between 2-8°C" 
                className="resize-none h-20"
                {...field} 
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <FormField
          control={formControl}
          name="facility_id"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Facility</FormLabel>
              <Select 
                value={isMultipleSitesSelected ? WHOLE_SITE_VALUE : field.value} 
                onValueChange={field.onChange}
                disabled={isMultipleSitesSelected || (isCreate ? selectedSiteIds.length === 0 : !selectedSiteId) || loadingOptions}
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
              {isMultipleSitesSelected && (
                <p className="text-xs text-muted-foreground">Locked when multiple sites selected</p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={formControl}
          name="initial_due_date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Due Date *</FormLabel>
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
          control={formControl}
          name="recurrence_pattern"
          render={({ field }) => (
            <FormItem className="flex flex-col">
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
          control={formControl}
          name="recurrence_interval_days"
          render={({ field }) => (
            <FormItem className="max-w-[200px]">
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

      {/* Assignment Type Toggle */}
      <div className="space-y-3">
        <FormField
          control={formControl}
          name="assignment_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assign To</FormLabel>
              <FormControl>
                <RadioGroup
                  value={field.value}
                  onValueChange={field.onChange}
                  className="flex gap-4"
                  disabled={isMultipleSitesSelected}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="individual" id="individual" />
                    <Label htmlFor="individual" className="cursor-pointer">Individual</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="job_family" id="job_family" />
                    <Label htmlFor="job_family" className="cursor-pointer">Job Family</Label>
                  </div>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {assignmentType === "individual" ? (
          <FormField
            control={formControl}
            name="assignee_id"
            render={({ field }) => (
              <FormItem className="flex flex-col max-w-[300px]">
                <FormLabel>Assignee</FormLabel>
                <Select 
                  value={isMultipleSitesSelected ? UNASSIGNED_VALUE : field.value} 
                  onValueChange={field.onChange}
                  disabled={isMultipleSitesSelected || (isCreate ? selectedSiteIds.length === 0 : !selectedSiteId) || loadingOptions}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Unassigned" />
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
                {isMultipleSitesSelected && (
                  <p className="text-xs text-muted-foreground">Locked when multiple sites selected</p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <FormField
            control={formControl}
            name="job_family_id"
            render={({ field }) => (
              <FormItem className="flex flex-col max-w-[300px]">
                <FormLabel>Job Family</FormLabel>
                <Select 
                  value={isMultipleSitesSelected ? UNASSIGNED_VALUE : field.value} 
                  onValueChange={field.onChange}
                  disabled={isMultipleSitesSelected}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select job family" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={UNASSIGNED_VALUE}>Unassigned</SelectItem>
                    {jobFamilies.map((family) => (
                      <SelectItem key={family.id} value={family.id}>
                        {family.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isMultipleSitesSelected && (
                  <p className="text-xs text-muted-foreground">Locked when multiple sites selected</p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>
    </>
  );

  if (isEditMode) {
    return (
      <div 
        className="border rounded-lg p-4 bg-muted/30 space-y-4"
        onKeyDown={handleKeyDown}
      >
        <Form {...editForm}>
          <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task Name *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g. Check vaccine fridge temperature" 
                        {...field} 
                        ref={nameInputRef}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
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
            </div>

            {renderFormFields(editForm.control, editRecurrencePattern, editAssignmentType, false)}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={saving}>
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={saving}>
                <Check className="h-4 w-4 mr-1" />
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    );
  }

  return (
    <div 
      className="border rounded-lg p-4 bg-muted/30 space-y-4"
      onKeyDown={handleKeyDown}
    >
      <Form {...createForm}>
        <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={createForm.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Name *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g. Check vaccine fridge temperature" 
                      {...field} 
                      ref={nameInputRef}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={createForm.control}
              name="site_ids"
              render={() => (
                <FormItem>
                  <FormLabel>Sites *</FormLabel>
                  <div className="border rounded-md p-3 space-y-2 max-h-40 overflow-y-auto bg-background">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <Checkbox 
                        id="all-sites"
                        checked={allSitesSelected}
                        onCheckedChange={handleAllSitesToggle}
                      />
                      <label htmlFor="all-sites" className="font-medium text-sm cursor-pointer">
                        All Sites ({sites.length})
                      </label>
                    </div>
                    {sites.map((site) => (
                      <div key={site.id} className="flex items-center gap-2">
                        <Checkbox 
                          id={`site-${site.id}`}
                          checked={selectedSiteIds.includes(site.id)}
                          onCheckedChange={(checked) => handleSiteToggle(site.id, !!checked)}
                        />
                        <label htmlFor={`site-${site.id}`} className="text-sm cursor-pointer">
                          {site.name}
                        </label>
                      </div>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {renderFormFields(createForm.control, createRecurrencePattern, createAssignmentType, true)}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={saving}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              <Check className="h-4 w-4 mr-1" />
              {saving ? "Saving..." : selectedSiteIds.length > 1 ? `Add ${selectedSiteIds.length} Tasks` : "Add Task"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default WorkflowInlineTaskForm;
