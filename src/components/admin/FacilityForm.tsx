import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const facilitySchema = z.object({
  name: z.string().min(1, "Facility name is required").max(100),
  capacity: z.coerce.number().min(0, "Capacity must be 0 or greater"),
  facility_type: z.enum(["clinic_room", "general_facility"]),
});

export type FacilityFormData = z.infer<typeof facilitySchema>;

export interface Facility {
  id: string;
  site_id: string;
  name: string;
  capacity: number;
  facility_type: "clinic_room" | "general_facility";
  is_active: boolean;
}

interface FacilityFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facility: Facility | null;
  siteName: string;
  onSave: (data: FacilityFormData) => Promise<void>;
}

export const FacilityForm = ({ open, onOpenChange, facility, siteName, onSave }: FacilityFormProps) => {
  const [saving, setSaving] = useState(false);

  const form = useForm<FacilityFormData>({
    resolver: zodResolver(facilitySchema),
    defaultValues: {
      name: "",
      capacity: 0,
      facility_type: "clinic_room",
    },
  });

  useEffect(() => {
    if (facility) {
      form.reset({
        name: facility.name,
        capacity: facility.capacity,
        facility_type: facility.facility_type || "general_facility",
      });
    } else {
      form.reset({
        name: "",
        capacity: 0,
        facility_type: "clinic_room",
      });
    }
  }, [facility, form]);

  const onSubmit = async (data: FacilityFormData) => {
    setSaving(true);
    try {
      await onSave(data);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{facility ? "Edit Facility" : "Add New Facility"}</DialogTitle>
          <DialogDescription>
            {facility ? `Update facility details for ${siteName}.` : `Add a new facility to ${siteName}.`}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Facility Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Consultation Room 1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="capacity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Capacity *</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} placeholder="e.g. 4" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {facility ? "Save Changes" : "Add Facility"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
