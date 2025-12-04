import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export interface WorkingDays {
  mon: boolean;
  tue: boolean;
  wed: boolean;
  thu: boolean;
  fri: boolean;
  sat: boolean;
  sun: boolean;
}

const defaultWorkingDays: WorkingDays = {
  mon: false,
  tue: false,
  wed: false,
  thu: false,
  fri: false,
  sat: false,
  sun: false,
};

const formSchema = z.object({
  contracted_hours: z.string().optional(),
  working_days: z.object({
    mon: z.boolean(),
    tue: z.boolean(),
    wed: z.boolean(),
    thu: z.boolean(),
    fri: z.boolean(),
    sat: z.boolean(),
    sun: z.boolean(),
  }),
});

type FormValues = z.infer<typeof formSchema>;

interface UserEditFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    contracted_hours: number | null;
    working_days: WorkingDays | null;
  } | null;
  onSuccess: () => void;
}

const dayLabels: { key: keyof WorkingDays; label: string; short: string }[] = [
  { key: "mon", label: "Monday", short: "M" },
  { key: "tue", label: "Tuesday", short: "T" },
  { key: "wed", label: "Wednesday", short: "W" },
  { key: "thu", label: "Thursday", short: "T" },
  { key: "fri", label: "Friday", short: "F" },
  { key: "sat", label: "Saturday", short: "S" },
  { key: "sun", label: "Sunday", short: "S" },
];

export const UserEditForm = ({ open, onOpenChange, user, onSuccess }: UserEditFormProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      contracted_hours: "",
      working_days: defaultWorkingDays,
    },
  });

  // Reset form when user changes
  useEffect(() => {
    if (user && open) {
      form.reset({
        contracted_hours: user.contracted_hours?.toString() || "",
        working_days: user.working_days || defaultWorkingDays,
      });
    }
  }, [user, open, form]);

  const onSubmit = async (values: FormValues) => {
    if (!user) return;
    
    setIsSubmitting(true);
    
    const contractedHours = values.contracted_hours 
      ? parseFloat(values.contracted_hours) 
      : null;
    
    const { error } = await supabase
      .from("profiles")
      .update({
        contracted_hours: contractedHours,
        working_days: values.working_days,
      })
      .eq("id", user.id);
    
    if (error) {
      toast({
        title: "Error updating user",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "User updated",
        description: "Working hours have been updated successfully.",
      });
      onSuccess();
      onOpenChange(false);
    }
    
    setIsSubmitting(false);
  };

  const userName = user?.first_name || user?.last_name 
    ? `${user?.first_name || ''} ${user?.last_name || ''}`.trim()
    : user?.email || 'User';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Working Hours</DialogTitle>
          <DialogDescription>{userName}</DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="contracted_hours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contracted Hours</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      max="168"
                      placeholder="e.g., 37.5"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <Label>Working Days</Label>
              <div className="flex flex-wrap gap-4">
                {dayLabels.map(({ key, label }) => (
                  <FormField
                    key={key}
                    control={form.control}
                    name={`working_days.${key}`}
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <Label className="text-sm font-normal cursor-pointer">
                          {label.slice(0, 3)}
                        </Label>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
