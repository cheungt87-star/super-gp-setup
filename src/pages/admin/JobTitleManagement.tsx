import { useState, useEffect, useCallback } from "react";
import { Briefcase, Plus, Pencil, Trash2, Loader2, X, Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

interface JobTitle {
  id: string;
  name: string;
  description: string | null;
}

const JobTitleManagement = () => {
  const { toast } = useToast();
  const { organisationId } = useOrganisation();

  const [jobTitles, setJobTitles] = useState<JobTitle[]>([]);
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

  const fetchJobTitles = useCallback(async () => {
    if (!organisationId) return;

    const { data, error } = await supabase
      .from("job_titles")
      .select("id, name, description")
      .eq("organisation_id", organisationId)
      .order("name");

    if (error) {
      toast({
        title: "Error loading job titles",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setJobTitles(data || []);
    }
    setLoading(false);
  }, [organisationId, toast]);

  useEffect(() => {
    fetchJobTitles();
  }, [fetchJobTitles]);

  const handleAdd = async () => {
    if (!newName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a job title name",
        variant: "destructive",
      });
      return;
    }

    if (!organisationId) return;

    setSaving(true);

    const { error } = await supabase.from("job_titles").insert({
      name: newName.trim(),
      description: newDescription.trim() || null,
      organisation_id: organisationId,
    });

    setSaving(false);

    if (error) {
      if (error.code === "23505") {
        toast({
          title: "Duplicate job title",
          description: "A job title with this name already exists",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error adding job title",
          description: error.message,
          variant: "destructive",
        });
      }
      return;
    }

    toast({ title: "Job title added" });
    setNewName("");
    setNewDescription("");
    setShowAddForm(false);
    fetchJobTitles();
  };

  const startEdit = (jobTitle: JobTitle) => {
    setEditingId(jobTitle.id);
    setEditName(jobTitle.name);
    setEditDescription(jobTitle.description || "");
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
      .from("job_titles")
      .update({
        name: editName.trim(),
        description: editDescription.trim() || null,
      })
      .eq("id", editingId);

    setSaving(false);

    if (error) {
      if (error.code === "23505") {
        toast({
          title: "Duplicate job title",
          description: "A job title with this name already exists",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error updating job title",
          description: error.message,
          variant: "destructive",
        });
      }
      return;
    }

    toast({ title: "Job title updated" });
    cancelEdit();
    fetchJobTitles();
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    const { error } = await supabase.from("job_titles").delete().eq("id", deleteId);

    if (error) {
      toast({
        title: "Error deleting job title",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Job title deleted" });
      fetchJobTitles();
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
                <Briefcase className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Job Titles</CardTitle>
                <CardDescription>
                  {jobTitles.length} job title{jobTitles.length !== 1 ? "s" : ""} in your organisation
                </CardDescription>
              </div>
            </div>
            {!showAddForm && (
              <Button onClick={() => setShowAddForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Job Title
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Form */}
          {showAddForm && (
            <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">New Job Title</h3>
                <Button variant="ghost" size="icon" onClick={() => setShowAddForm(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-3">
                <Input
                  placeholder="Job title name"
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

          {/* Job Titles List */}
          {jobTitles.length === 0 && !showAddForm ? (
            <div className="text-center py-8 text-muted-foreground">
              <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No job titles yet</p>
              <p className="text-sm">Add your first job title to get started</p>
            </div>
          ) : (
            <div className="space-y-2">
              {jobTitles.map((jobTitle) => (
                <div
                  key={jobTitle.id}
                  className="border rounded-lg p-4 bg-background"
                >
                  {editingId === jobTitle.id ? (
                    <div className="space-y-3">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Job title name"
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
                        <p className="font-medium">{jobTitle.name}</p>
                        {jobTitle.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {jobTitle.description}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => startEdit(jobTitle)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(jobTitle.id)}
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
            <AlertDialogTitle>Delete Job Title</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this job title? Users with this job title will no longer have it assigned.
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

export default JobTitleManagement;