import { useState } from "react";
import { UserPlus, Upload, Loader2, AlertCircle, CheckCircle2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FilterOption {
  id: string;
  name: string;
}

interface AddUserDialogProps {
  organisationId: string;
  sites: FilterOption[];
  jobTitles: FilterOption[];
  onSuccess: () => void;
}

interface CSVUser {
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  contracted_hours?: string;
  site?: string;
  job_title?: string;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

type WorkingDays = {
  mon: boolean;
  tue: boolean;
  wed: boolean;
  thu: boolean;
  fri: boolean;
  sat: boolean;
  sun: boolean;
};

const defaultWorkingDays: WorkingDays = {
  mon: false,
  tue: false,
  wed: false,
  thu: false,
  fri: false,
  sat: false,
  sun: false,
};

export function AddUserDialog({ organisationId, sites, jobTitles, onSuccess }: AddUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Manual form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneExt, setPhoneExt] = useState("");
  const [jobTitleId, setJobTitleId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [contractedHours, setContractedHours] = useState("");
  const [workingDays, setWorkingDays] = useState<WorkingDays>(defaultWorkingDays);

  // CSV state
  const [csvUsers, setCsvUsers] = useState<CSVUser[]>([]);
  const [csvErrors, setCsvErrors] = useState<ValidationError[]>([]);
  const [fileName, setFileName] = useState("");

  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setPhoneExt("");
    setJobTitleId("");
    setSiteId("");
    setContractedHours("");
    setWorkingDays(defaultWorkingDays);
    setCsvUsers([]);
    setCsvErrors([]);
    setFileName("");
  };

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleManualSubmit = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      toast.error("First name, last name, and email are required");
      return;
    }

    if (!validateEmail(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("profiles").insert({
      id: crypto.randomUUID(),
      email: email.trim().toLowerCase(),
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      phone: phone.trim() || null,
      phone_ext: phoneExt.trim() || null,
      job_title_id: jobTitleId || null,
      primary_site_id: siteId || null,
      contracted_hours: contractedHours ? parseFloat(contractedHours) : null,
      working_days: workingDays,
      organisation_id: organisationId,
    });

    setSaving(false);

    if (error) {
      if (error.code === "23505") {
        toast.error("A user with this email already exists");
      } else {
        toast.error("Failed to add user: " + error.message);
      }
      return;
    }

    toast.success("User added successfully");
    resetForm();
    setOpen(false);
    onSuccess();
  };

  const parseCSV = (text: string): CSVUser[] => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];

    const headers = lines[0].toLowerCase().split(",").map((h) => h.trim());
    const results: CSVUser[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim());
      const user: CSVUser = {
        email: "",
        first_name: "",
        last_name: "",
      };

      headers.forEach((header, index) => {
        const value = values[index] || "";
        if (header === "email") user.email = value;
        else if (header === "first_name" || header === "firstname") user.first_name = value;
        else if (header === "last_name" || header === "lastname") user.last_name = value;
        else if (header === "phone") user.phone = value;
        else if (header === "contracted_hours") user.contracted_hours = value;
        else if (header === "site") user.site = value;
        else if (header === "job_title") user.job_title = value;
      });

      if (user.email || user.first_name || user.last_name) {
        results.push(user);
      }
    }

    return results;
  };

  const validateUsers = (users: CSVUser[]): ValidationError[] => {
    const errors: ValidationError[] = [];
    const emails = new Set<string>();

    users.forEach((user, index) => {
      const row = index + 2;

      if (!user.email) {
        errors.push({ row, field: "email", message: "Email is required" });
      } else if (!validateEmail(user.email)) {
        errors.push({ row, field: "email", message: `Invalid email: ${user.email}` });
      } else if (emails.has(user.email.toLowerCase())) {
        errors.push({ row, field: "email", message: `Duplicate email: ${user.email}` });
      } else {
        emails.add(user.email.toLowerCase());
      }

      if (!user.first_name) {
        errors.push({ row, field: "first_name", message: "First name is required" });
      }

      if (!user.last_name) {
        errors.push({ row, field: "last_name", message: "Last name is required" });
      }
    });

    return errors;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseCSV(text);
      const validationErrors = validateUsers(parsed);

      setCsvUsers(parsed);
      setCsvErrors(validationErrors);
    };

    reader.readAsText(file);
  };

  const handleCSVSubmit = async () => {
    if (csvUsers.length === 0) {
      toast.error("No users to import");
      return;
    }

    if (csvErrors.length > 0) {
      toast.error("Please fix validation errors before importing");
      return;
    }

    setSaving(true);

    // Map site and job title names to IDs
    const usersToInsert = csvUsers.map((user) => {
      const siteMatch = sites.find(
        (s) => s.name.toLowerCase() === user.site?.toLowerCase()
      );
      const jobTitleMatch = jobTitles.find(
        (j) => j.name.toLowerCase() === user.job_title?.toLowerCase()
      );

      return {
        id: crypto.randomUUID(),
        email: user.email.trim().toLowerCase(),
        first_name: user.first_name.trim(),
        last_name: user.last_name.trim(),
        phone: user.phone?.trim() || null,
        contracted_hours: user.contracted_hours ? parseFloat(user.contracted_hours) : null,
        primary_site_id: siteMatch?.id || null,
        job_title_id: jobTitleMatch?.id || null,
        working_days: defaultWorkingDays,
        organisation_id: organisationId,
      };
    });

    const { error } = await supabase.from("profiles").insert(usersToInsert);

    setSaving(false);

    if (error) {
      if (error.code === "23505") {
        toast.error("One or more users already exist with these email addresses");
      } else {
        toast.error("Failed to import users: " + error.message);
      }
      return;
    }

    toast.success(`${csvUsers.length} user(s) imported successfully`);
    resetForm();
    setOpen(false);
    onSuccess();
  };

  const toggleDay = (day: keyof WorkingDays) => {
    setWorkingDays((prev) => ({ ...prev, [day]: !prev[day] }));
  };

  const dayLabels: { key: keyof WorkingDays; label: string }[] = [
    { key: "mon", label: "M" },
    { key: "tue", label: "T" },
    { key: "wed", label: "W" },
    { key: "thu", label: "T" },
    { key: "fri", label: "F" },
    { key: "sat", label: "S" },
    { key: "sun", label: "S" },
  ];

  return (
    <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) resetForm(); }}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Users
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Team Members</DialogTitle>
          <DialogDescription>
            Add users manually or import from a CSV file
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="manual" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">Add Manually</TabsTrigger>
            <TabsTrigger value="csv">Import CSV</TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="John"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Smith"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john.smith@example.com"
              />
            </div>

            <div className="grid grid-cols-[1fr_auto] gap-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="07700 900000"
                />
              </div>
              <div className="space-y-2 w-20">
                <Label htmlFor="phoneExt">Ext.</Label>
                <Input
                  id="phoneExt"
                  value={phoneExt}
                  onChange={(e) => setPhoneExt(e.target.value)}
                  placeholder="123"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Job Title</Label>
                <Select value={jobTitleId} onValueChange={setJobTitleId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {jobTitles.map((jt) => (
                      <SelectItem key={jt.id} value={jt.id}>
                        {jt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Primary Site</Label>
                <Select value={siteId} onValueChange={setSiteId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sites.map((site) => (
                      <SelectItem key={site.id} value={site.id}>
                        {site.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hours">Contracted Hours</Label>
              <Input
                id="hours"
                type="number"
                value={contractedHours}
                onChange={(e) => setContractedHours(e.target.value)}
                placeholder="37.5"
              />
            </div>

            <div className="space-y-2">
              <Label>Working Days</Label>
              <div className="flex gap-2">
                {dayLabels.map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleDay(key)}
                    className={`w-8 h-8 rounded-full text-xs font-medium transition-colors ${
                      workingDays[key]
                        ? "bg-green-100 text-green-700 border border-green-300"
                        : "bg-muted text-muted-foreground border border-border"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={handleManualSubmit}
              disabled={saving}
              className="w-full"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add User
            </Button>
          </TabsContent>

          <TabsContent value="csv" className="space-y-4 mt-4">
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
              <Input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                id="csv-upload-dialog"
              />
              <Label
                htmlFor="csv-upload-dialog"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-sm">
                    {fileName || "Click to upload CSV"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Required: email, first_name, last_name
                  </p>
                </div>
              </Label>
            </div>

            {csvUsers.length > 0 && (
              <div className="space-y-3">
                {csvErrors.length > 0 ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {csvErrors.length} error(s) found:
                      <ul className="mt-1 text-xs list-disc list-inside">
                        {csvErrors.slice(0, 3).map((err, i) => (
                          <li key={i}>Row {err.row}: {err.message}</li>
                        ))}
                        {csvErrors.length > 3 && <li>...and {csvErrors.length - 3} more</li>}
                      </ul>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-700">
                      {csvUsers.length} user(s) ready to import
                    </AlertDescription>
                  </Alert>
                )}

                <div className="border rounded-lg overflow-hidden text-sm">
                  <div className="bg-muted px-3 py-2 font-medium flex gap-3">
                    <span className="flex-1">Name</span>
                    <span className="flex-1">Email</span>
                  </div>
                  <div className="max-h-32 overflow-y-auto divide-y">
                    {csvUsers.slice(0, 5).map((user, index) => (
                      <div key={index} className="px-3 py-2 flex gap-3">
                        <span className="flex-1">{user.first_name} {user.last_name}</span>
                        <span className="flex-1 text-muted-foreground truncate">{user.email}</span>
                      </div>
                    ))}
                    {csvUsers.length > 5 && (
                      <div className="px-3 py-2 text-muted-foreground">
                        ...and {csvUsers.length - 5} more
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="text-xs">
                <p className="font-medium">CSV Columns</p>
                <p className="text-muted-foreground">
                  email, first_name, last_name, phone, contracted_hours, site, job_title
                </p>
              </div>
            </div>

            <Button
              onClick={handleCSVSubmit}
              disabled={saving || csvUsers.length === 0 || csvErrors.length > 0}
              className="w-full"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Import {csvUsers.length} User{csvUsers.length !== 1 ? "s" : ""}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
