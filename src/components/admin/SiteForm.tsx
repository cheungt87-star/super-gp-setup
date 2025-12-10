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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OpeningHoursForm, OpeningHour } from "./OpeningHoursForm";

const siteSchema = z.object({
  name: z.string().min(1, "Site name is required").max(100),
  address_line_1: z.string().min(1, "Address Line 1 is required").max(255),
  address_line_2: z.string().max(255).optional().or(z.literal("")),
  city: z.string().min(1, "City is required").max(100),
  county: z.string().min(1, "County is required").max(100),
  postcode: z.string().min(1, "Postcode is required").max(20),
  email: z.string().email("Invalid email").max(255).optional().or(z.literal("")),
  phone: z.string().max(20).optional().or(z.literal("")),
  phone_ext: z.string().max(10).optional().or(z.literal("")),
  site_manager_id: z.string().uuid().optional().nullable(),
});

export type SiteFormData = z.infer<typeof siteSchema>;

interface UserOption {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

interface Site {
  id: string;
  name: string;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  county: string | null;
  postcode: string | null;
  email: string | null;
  phone: string | null;
  phone_ext: string | null;
  site_manager_id: string | null;
}

interface SiteFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  site: Site | null;
  users: UserOption[];
  openingHours: OpeningHour[];
  onSave: (data: SiteFormData, hours: OpeningHour[]) => Promise<void>;
}

const DEFAULT_HOURS: OpeningHour[] = [
  { day_of_week: 0, am_open_time: "09:00", am_close_time: "13:00", pm_open_time: "14:00", pm_close_time: "17:00", is_closed: false },
  { day_of_week: 1, am_open_time: "09:00", am_close_time: "13:00", pm_open_time: "14:00", pm_close_time: "17:00", is_closed: false },
  { day_of_week: 2, am_open_time: "09:00", am_close_time: "13:00", pm_open_time: "14:00", pm_close_time: "17:00", is_closed: false },
  { day_of_week: 3, am_open_time: "09:00", am_close_time: "13:00", pm_open_time: "14:00", pm_close_time: "17:00", is_closed: false },
  { day_of_week: 4, am_open_time: "09:00", am_close_time: "13:00", pm_open_time: "14:00", pm_close_time: "17:00", is_closed: false },
  { day_of_week: 5, am_open_time: "09:00", am_close_time: "13:00", pm_open_time: "14:00", pm_close_time: "17:00", is_closed: true },
  { day_of_week: 6, am_open_time: "09:00", am_close_time: "13:00", pm_open_time: "14:00", pm_close_time: "17:00", is_closed: true },
];

export const SiteForm = ({ open, onOpenChange, site, users, openingHours, onSave }: SiteFormProps) => {
  const [saving, setSaving] = useState(false);
  const [hours, setHours] = useState<OpeningHour[]>(DEFAULT_HOURS);

  const form = useForm<SiteFormData>({
    resolver: zodResolver(siteSchema),
    defaultValues: {
      name: "",
      address_line_1: "",
      address_line_2: "",
      city: "",
      county: "",
      postcode: "",
      email: "",
      phone: "",
      phone_ext: "",
      site_manager_id: null,
    },
  });

  useEffect(() => {
    if (site) {
      form.reset({
        name: site.name,
        address_line_1: site.address_line_1 || "",
        address_line_2: site.address_line_2 || "",
        city: site.city || "",
        county: site.county || "",
        postcode: site.postcode || "",
        email: site.email || "",
        phone: site.phone || "",
        phone_ext: site.phone_ext || "",
        site_manager_id: site.site_manager_id,
      });
      setHours(openingHours.length > 0 ? openingHours : DEFAULT_HOURS);
    } else {
      form.reset({
        name: "",
        address_line_1: "",
        address_line_2: "",
        city: "",
        county: "",
        postcode: "",
        email: "",
        phone: "",
        phone_ext: "",
        site_manager_id: null,
      });
      setHours(DEFAULT_HOURS);
    }
  }, [site, openingHours, form]);

  const onSubmit = async (data: SiteFormData) => {
    setSaving(true);
    try {
      await onSave(data, hours);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const getUserDisplayName = (user: UserOption) => {
    if (user.first_name || user.last_name) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim();
    }
    return "Unnamed User";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{site ? "Edit Site" : "Add New Site"}</DialogTitle>
          <DialogDescription>
            {site ? "Update the site details below." : "Enter the details for the new site."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Site Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Main Surgery" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address_line_1"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address Line 1 *</FormLabel>
                  <FormControl>
                    <Input placeholder="123 Main Street" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address_line_2"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address Line 2</FormLabel>
                  <FormControl>
                    <Input placeholder="Suite 100 (optional)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City *</FormLabel>
                    <FormControl>
                      <Input placeholder="London" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="county"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>County *</FormLabel>
                    <FormControl>
                      <Input placeholder="Greater London" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="postcode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Postcode *</FormLabel>
                    <FormControl>
                      <Input placeholder="SW1A 1AA" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="contact@site.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-[1fr_auto] gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="020 1234 5678" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone_ext"
                render={({ field }) => (
                  <FormItem className="w-24">
                    <FormLabel>Ext.</FormLabel>
                    <FormControl>
                      <Input placeholder="123" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="site_manager_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Site Manager</FormLabel>
                  <Select
                    value={field.value || "none"}
                    onValueChange={(value) => field.onChange(value === "none" ? null : value)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a site manager" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-background">
                      <SelectItem value="none">No manager assigned</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {getUserDisplayName(user)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <OpeningHoursForm hours={hours} onChange={setHours} />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {site ? "Save Changes" : "Add Site"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
