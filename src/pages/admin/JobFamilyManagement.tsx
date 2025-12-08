import { useState, useEffect, useCallback } from "react";
import { FolderTree, Plus, Pencil, Trash2, Loader2, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useOrganisation } from "@/contexts/OrganisationContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface JobFamily {
  id: string;
  name: string;
  description: string | null;
  job_title_count: number;
}

const JobFamilyManagement = () => {
  const { toast } = useToast();
  const { organisationId } = useOrganisation();

  const [jobFamilies, setJobFamilies] = useState<JobFamily[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Add form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // Delete dialog
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchJobFamilies = useCallback(async () => {
    if (!organisationId) return;

    // Fetch job families with count of job titles
    const { data: familiesData, error: familiesError } = await supabase
      .from("job_families")
      .select("id, name, description")
      .eq("organisation_id", organisationId)
      .order("name");

    if (familiesError) {
      toast({
        title: "Error loading job families",
        description: familiesError.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Fetch job title counts per family
    const { data: titlesData } = await supabase
      .from("job_titles")
      .select("job_family_id")
      .eq("organisation_id", organisationId)
      .not("job_family_id", "is", null);

    // Count titles per family
    const countMap: Record<string, number> = {};
    titlesData?.forEach((title) => {
      if (title.job_family_id) {
        countMap[title.job_family_id] = (countMap[title.job_family_id] || 0) + 1;
      }
    });

    const familiesWithCounts: JobFamily[] = (familiesData || []).map((f) => ({
      ...f,
      job_title_count: countMap[f.id] || 0,
    }));

    setJobFamilies(familiesWithCounts);
    setLoading(false);
  }, [organisationId, toast]);

  useEffect(() => {
    fetchJobFamilies();
  }, [fetchJobFamilies]);

  const handleAdd = async () => {
    if (!newName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a job family name",
        variant: "destructive",
      });
      return;
    }

    if (!organisationId) return;

    setSaving(true);

    const { error } = await supabase.from("job_families").insert({
      name: newName.trim(),
      description: newDescription.trim() || null,
      organisation_id: organisationId,
    });

    setSaving(false);

    if (error) {
      if (error.code === "23505") {
        toast({
          title: "Duplicate job family",
          description: "A job family with this name already exists",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error adding job family",
          description: error.message,
          variant: "destructive",
        });
      }
      return;
    }

    toast({ title: "Job family added" });
    setNewName("");
    setNewDescription("");
    setShowAddForm(false);
    fetchJobFamilies();
  };

  const startEdit = (jobFamily: JobFamily) => {
    setEditingId(jobFamily.id);
    setEditName(jobFamily.name);
    setEditDescription(jobFamily.description || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditDescription("");
  };

  const handleSaveEdit = async () => {
    if (!editName.trim() || !editingId) return;

    setSaving(true);

    const { error } = await supabase
      .from("job_families")
      .update({
        name: editName.trim(),
        description: editDescription.trim() || null,
      })
      .eq("id", editingId);

    setSaving(false);

    if (error) {
      if (error.code === "23505") {
        toast({
          title: "Duplicate job family",
          description: "A job family with this name already exists",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error updating job family",
          description: error.message,
          variant: "destructive",
        });
      }
      return;
    }

    toast({ title: "Job family updated" });
    cancelEdit();
    fetchJobFamilies();
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    const { error } = await supabase.from("job_families").delete().eq("id", deleteId);

    if (error) {
      toast({
        title: "Error deleting job family",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Job family deleted" });
      fetchJobFamilies();
    }

    setDeleteId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <Card className="animate-fade-in">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <FolderTree className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Job Families</CardTitle>
                <CardDescription>
                  {jobFamilies.length} job famil{jobFamilies.length !== 1 ? "ies" : "y"} in your organisation
                </CardDescription>
              </div>
            </div>
            {!showAddForm && (
              <Button onClick={() => setShowAddForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Job Family
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Form */}
          {showAddForm && (
            <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">New Job Family</h3>
                <Button variant="ghost" size="icon" onClick={() => setShowAddForm(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-3">
                <Input
                  placeholder="Job family name (e.g., Clinical Staff, Administrative)"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
                <Textarea
                  placeholder="Description (optional)"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={2}
                />
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowAddForm(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAdd} disabled={saving || !newName.trim()}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Job Families List */}
          {jobFamilies.length === 0 && !showAddForm ? (
            <div className="text-center py-8 text-muted-foreground">
              <FolderTree className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No job families yet</p>
              <p className="text-sm">Create job families to group related job titles together</p>
            </div>
          ) : (
            <div className="space-y-2">
              {jobFamilies.map((jobFamily) => (
                <div
                  key={jobFamily.id}
                  className="border rounded-lg p-4 bg-background"
                >
                  {editingId === jobFamily.id ? (
                    <div className="space-y-3">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Job family name"
                      />
                      <Textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="Description (optional)"
                        rows={2}
                      />
                      <div className="flex gap-2 justify-end">
                        <Button variant="ghost" size="sm" onClick={cancelEdit}>
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSaveEdit}
                          disabled={saving || !editName.trim()}
                        >
                          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{jobFamily.name}</p>
                          <Badge variant="secondary" className="text-xs">
                            {jobFamily.job_title_count} title{jobFamily.job_title_count !== 1 ? "s" : ""}
                          </Badge>
                        </div>
                        {jobFamily.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {jobFamily.description}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => startEdit(jobFamily)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(jobFamily.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Job Family</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this job family? Job titles in this family will become unassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default JobFamilyManagement;
