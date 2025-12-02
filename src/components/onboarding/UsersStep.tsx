import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Loader2, Users, FileText, AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface UsersStepProps {
  onNext: () => void;
  onBack: () => void;
  organisationId: string | null;
}

interface CSVUser {
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  contracted_hours?: string;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export const UsersStep = ({ onNext, onBack, organisationId }: UsersStepProps) => {
  const [users, setUsers] = useState<CSVUser[]>([]);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [saving, setSaving] = useState(false);
  const [fileName, setFileName] = useState("");
  const [sites, setSites] = useState<{ id: string; name: string }[]>([]);
  const [jobTitles, setJobTitles] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const [sitesRes, jobTitlesRes] = await Promise.all([
        supabase.from("sites").select("id, name"),
        supabase.from("job_titles").select("id, name"),
      ]);
      if (sitesRes.data) setSites(sitesRes.data);
      if (jobTitlesRes.data) setJobTitles(jobTitlesRes.data);
    };
    fetchData();
  }, []);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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
      const row = index + 2; // Account for header row and 0-index

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

      setUsers(parsed);
      setErrors(validationErrors);
    };

    reader.readAsText(file);
  };

  const handleSave = async () => {
    if (users.length === 0) {
      toast.info("No users to import. You can skip this step.");
      onNext();
      return;
    }

    if (errors.length > 0) {
      toast.error("Please fix validation errors before continuing");
      return;
    }

    if (!organisationId) {
      toast.error("Organisation not found. Please try logging in again.");
      return;
    }

    setSaving(true);

    // Create profiles for each user (pre-created staff records)
    const defaultSiteId = sites[0]?.id;
    const defaultJobTitleId = jobTitles[0]?.id;

    const { error } = await supabase.from("profiles").insert(
      users.map((user) => ({
        id: crypto.randomUUID(),
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone || null,
        contracted_hours: user.contracted_hours ? parseFloat(user.contracted_hours) : null,
        primary_site_id: defaultSiteId || null,
        job_title_id: defaultJobTitleId || null,
        organisation_id: organisationId,
      }))
    );

    if (error) {
      toast.error("Failed to import users: " + error.message);
    } else {
      toast.success(`${users.length} user(s) imported successfully`);
      onNext();
    }
    setSaving(false);
  };

  const handleSkip = () => {
    onNext();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center">
            <Users className="h-5 w-5 text-accent-foreground" />
          </div>
          <div>
            <CardTitle>Import your team</CardTitle>
            <CardDescription>Upload a CSV file with your staff members</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
          <Input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
            id="csv-upload"
          />
          <Label
            htmlFor="csv-upload"
            className="cursor-pointer flex flex-col items-center gap-3"
          >
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <Upload className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">
                {fileName || "Click to upload CSV"}
              </p>
              <p className="text-sm text-muted-foreground">
                Required columns: email, first_name, last_name
              </p>
            </div>
          </Label>
        </div>

        {users.length > 0 && (
          <div className="space-y-4">
            {errors.length > 0 ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {errors.length} validation error(s) found. Please fix your CSV and re-upload.
                  <ul className="mt-2 text-sm list-disc list-inside">
                    {errors.slice(0, 5).map((err, i) => (
                      <li key={i}>Row {err.row}: {err.message}</li>
                    ))}
                    {errors.length > 5 && <li>...and {errors.length - 5} more</li>}
                  </ul>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="border-success/50 bg-success/10">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <AlertDescription className="text-success">
                  {users.length} user(s) ready to import
                </AlertDescription>
              </Alert>
            )}

            <div className="border border-border rounded-lg overflow-hidden">
              <div className="bg-muted px-4 py-2 text-sm font-medium flex gap-4">
                <span className="flex-1">Name</span>
                <span className="flex-1">Email</span>
              </div>
              <div className="max-h-48 overflow-y-auto divide-y divide-border">
                {users.slice(0, 10).map((user, index) => (
                  <div key={index} className="px-4 py-2 text-sm flex gap-4">
                    <span className="flex-1">{user.first_name} {user.last_name}</span>
                    <span className="flex-1 text-muted-foreground">{user.email}</span>
                  </div>
                ))}
                {users.length > 10 && (
                  <div className="px-4 py-2 text-sm text-muted-foreground">
                    ...and {users.length - 10} more
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
          <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
          <div className="text-sm">
            <p className="font-medium">CSV Template</p>
            <p className="text-muted-foreground">
              email, first_name, last_name, phone, contracted_hours
            </p>
          </div>
        </div>

        <div className="flex justify-between pt-4">
          <Button variant="ghost" onClick={onBack}>
            Back
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSkip}>
              Skip for now
            </Button>
            <Button onClick={handleSave} disabled={saving || (users.length > 0 && errors.length > 0)}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {users.length > 0 ? "Import Users" : "Continue"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
