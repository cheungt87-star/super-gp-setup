import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Briefcase } from "lucide-react";

interface JobTitle {
  name: string;
  description: string;
}

interface JobTitlesStepProps {
  onNext: () => void;
  onBack: () => void;
  organisationId: string | null;
}

const DEFAULT_JOB_TITLES: JobTitle[] = [
  { name: "GP Partner", description: "Senior GP with partnership stake" },
  { name: "Salaried GP", description: "Full or part-time employed GP" },
  { name: "Practice Manager", description: "Overall practice management" },
  { name: "Practice Nurse", description: "Registered nurse" },
  { name: "Healthcare Assistant", description: "Support clinical staff" },
  { name: "Receptionist", description: "Front desk and admin" },
];

export const JobTitlesStep = ({ onNext, onBack, organisationId }: JobTitlesStepProps) => {
  const [jobTitles, setJobTitles] = useState<JobTitle[]>(DEFAULT_JOB_TITLES);
  const [saving, setSaving] = useState(false);

  const addJobTitle = () => {
    setJobTitles([...jobTitles, { name: "", description: "" }]);
  };

  const removeJobTitle = (index: number) => {
    if (jobTitles.length > 1) {
      setJobTitles(jobTitles.filter((_, i) => i !== index));
    }
  };

  const updateJobTitle = (index: number, field: keyof JobTitle, value: string) => {
    const updated = [...jobTitles];
    updated[index][field] = value;
    setJobTitles(updated);
  };

  const handleSave = async () => {
    const validTitles = jobTitles.filter((jt) => jt.name.trim());
    
    if (validTitles.length === 0) {
      toast.error("Please add at least one job title");
      return;
    }

    if (!organisationId) {
      toast.error("Organisation not found. Please try logging in again.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("job_titles").insert(
      validTitles.map((jt) => ({
        name: jt.name,
        description: jt.description || null,
        organisation_id: organisationId,
      }))
    );

    if (error) {
      toast.error("Failed to save job titles: " + error.message);
    } else {
      toast.success(`${validTitles.length} job title(s) added`);
      onNext();
    }
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center">
            <Briefcase className="h-5 w-5 text-accent-foreground" />
          </div>
          <div>
            <CardTitle>Define job titles</CardTitle>
            <CardDescription>We've added common roles. Edit or add more as needed.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="max-h-96 overflow-y-auto space-y-3 pr-2">
          {jobTitles.map((jt, index) => (
            <div key={index} className="flex items-start gap-3 p-3 border border-border rounded-lg">
              <div className="flex-1 grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Title *</Label>
                  <Input
                    placeholder="Job title"
                    value={jt.name}
                    onChange={(e) => updateJobTitle(index, "name", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Description</Label>
                  <Input
                    placeholder="Optional description"
                    value={jt.description}
                    onChange={(e) => updateJobTitle(index, "description", e.target.value)}
                  />
                </div>
              </div>
              {jobTitles.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeJobTitle(index)}
                  className="mt-6 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        <Button type="button" variant="outline" onClick={addJobTitle} className="w-full gap-2">
          <Plus className="h-4 w-4" />
          Add Job Title
        </Button>

        <div className="flex justify-between pt-4">
          <Button variant="ghost" onClick={onBack}>
            Back
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
