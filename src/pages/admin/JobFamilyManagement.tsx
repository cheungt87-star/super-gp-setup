import { useState, useEffect, useCallback } from "react";
import { FolderTree, Plus, Pencil, Trash2, Loader2, X, ChevronDown, ChevronRight, ArrowRight } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface JobTitle {
  id: string;
  name: string;
  description: string | null;
  job_family_id: string | null;
}

interface JobFamily {
  id: string;
  name: string;
  description: string | null;
  job_titles: JobTitle[];
}

const JobFamilyManagement = () => {
  const { toast } = useToast();
  const { organisationId } = useOrganisation();

  const [jobFamilies, setJobFamilies] = useState<JobFamily[]>([]);
  const [unassignedTitles, setUnassignedTitles] = useState<JobTitle[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Expanded state for collapsibles
  const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(new Set());

  // Add family form state
  const [showAddFamilyForm, setShowAddFamilyForm] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState("");
  const [newFamilyDescription, setNewFamilyDescription] = useState("");

  // Add title form state (per family)
  const [addingTitleToFamily, setAddingTitleToFamily] = useState<string | null>(null);
  const [newTitleName, setNewTitleName] = useState("");
  const [newTitleDescription, setNewTitleDescription] = useState("");

  // Edit family state
  const [editingFamilyId, setEditingFamilyId] = useState<string | null>(null);
  const [editFamilyName, setEditFamilyName] = useState("");
  const [editFamilyDescription, setEditFamilyDescription] = useState("");

  // Edit title state
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editTitleName, setEditTitleName] = useState("");
  const [editTitleDescription, setEditTitleDescription] = useState("");

  // Delete dialogs
  const [deleteFamilyId, setDeleteFamilyId] = useState<string | null>(null);
  const [deleteTitleId, setDeleteTitleId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!organisationId) return;

    const [familiesRes, titlesRes] = await Promise.all([
      supabase
        .from("job_families")
        .select("id, name, description")
        .eq("organisation_id", organisationId)
        .order("name"),
      supabase
        .from("job_titles")
        .select("id, name, description, job_family_id")
        .eq("organisation_id", organisationId)
        .order("name"),
    ]);

    if (familiesRes.error) {
      toast({
        title: "Error loading job families",
        description: familiesRes.error.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Group titles by family
    const titlesByFamily: Record<string, JobTitle[]> = {};
    const unassigned: JobTitle[] = [];

    (titlesRes.data || []).forEach((title) => {
      if (title.job_family_id) {
        if (!titlesByFamily[title.job_family_id]) {
          titlesByFamily[title.job_family_id] = [];
        }
        titlesByFamily[title.job_family_id].push(title);
      } else {
        unassigned.push(title);
      }
    });

    const familiesWithTitles: JobFamily[] = (familiesRes.data || []).map((f) => ({
      ...f,
      job_titles: titlesByFamily[f.id] || [],
    }));

    setJobFamilies(familiesWithTitles);
    setUnassignedTitles(unassigned);
    
    // Auto-expand all families on first load
    if (expandedFamilies.size === 0) {
      setExpandedFamilies(new Set(familiesWithTitles.map(f => f.id)));
    }
    
    setLoading(false);
  }, [organisationId, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleFamily = (familyId: string) => {
    setExpandedFamilies((prev) => {
      const next = new Set(prev);
      if (next.has(familyId)) {
        next.delete(familyId);
      } else {
        next.add(familyId);
      }
      return next;
    });
  };

  // Family CRUD
  const handleAddFamily = async () => {
    if (!newFamilyName.trim() || !organisationId) return;

    setSaving(true);
    const { error } = await supabase.from("job_families").insert({
      name: newFamilyName.trim(),
      description: newFamilyDescription.trim() || null,
      organisation_id: organisationId,
    });
    setSaving(false);

    if (error) {
      toast({
        title: error.code === "23505" ? "Duplicate job family" : "Error adding job family",
        description: error.code === "23505" ? "A job family with this name already exists" : error.message,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Job family added" });
    setNewFamilyName("");
    setNewFamilyDescription("");
    setShowAddFamilyForm(false);
    fetchData();
  };

  const startEditFamily = (family: JobFamily) => {
    setEditingFamilyId(family.id);
    setEditFamilyName(family.name);
    setEditFamilyDescription(family.description || "");
  };

  const handleSaveEditFamily = async () => {
    if (!editFamilyName.trim() || !editingFamilyId) return;

    setSaving(true);
    const { error } = await supabase
      .from("job_families")
      .update({
        name: editFamilyName.trim(),
        description: editFamilyDescription.trim() || null,
      })
      .eq("id", editingFamilyId);
    setSaving(false);

    if (error) {
      toast({
        title: error.code === "23505" ? "Duplicate job family" : "Error updating",
        description: error.code === "23505" ? "A job family with this name already exists" : error.message,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Job family updated" });
    setEditingFamilyId(null);
    fetchData();
  };

  const handleDeleteFamily = async () => {
    if (!deleteFamilyId) return;

    const { error } = await supabase.from("job_families").delete().eq("id", deleteFamilyId);

    if (error) {
      toast({ title: "Error deleting job family", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Job family deleted" });
      fetchData();
    }
    setDeleteFamilyId(null);
  };

  // Title CRUD
  const handleAddTitle = async (familyId: string | null) => {
    if (!newTitleName.trim() || !organisationId) return;

    setSaving(true);
    const { error } = await supabase.from("job_titles").insert({
      name: newTitleName.trim(),
      description: newTitleDescription.trim() || null,
      job_family_id: familyId,
      organisation_id: organisationId,
    });
    setSaving(false);

    if (error) {
      toast({
        title: error.code === "23505" ? "Duplicate job title" : "Error adding job title",
        description: error.code === "23505" ? "A job title with this name already exists" : error.message,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Job title added" });
    setNewTitleName("");
    setNewTitleDescription("");
    setAddingTitleToFamily(null);
    fetchData();
  };

  const startEditTitle = (title: JobTitle) => {
    setEditingTitleId(title.id);
    setEditTitleName(title.name);
    setEditTitleDescription(title.description || "");
  };

  const handleSaveEditTitle = async () => {
    if (!editTitleName.trim() || !editingTitleId) return;

    setSaving(true);
    const { error } = await supabase
      .from("job_titles")
      .update({
        name: editTitleName.trim(),
        description: editTitleDescription.trim() || null,
      })
      .eq("id", editingTitleId);
    setSaving(false);

    if (error) {
      toast({
        title: error.code === "23505" ? "Duplicate job title" : "Error updating",
        description: error.code === "23505" ? "A job title with this name already exists" : error.message,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Job title updated" });
    setEditingTitleId(null);
    fetchData();
  };

  const handleDeleteTitle = async () => {
    if (!deleteTitleId) return;

    const { error } = await supabase.from("job_titles").delete().eq("id", deleteTitleId);

    if (error) {
      toast({ title: "Error deleting job title", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Job title deleted" });
      fetchData();
    }
    setDeleteTitleId(null);
  };

  const handleMoveTitle = async (titleId: string, newFamilyId: string | null) => {
    const { error } = await supabase
      .from("job_titles")
      .update({ job_family_id: newFamilyId })
      .eq("id", titleId);

    if (error) {
      toast({ title: "Error moving job title", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Job title moved" });
      fetchData();
    }
  };

  const renderTitleRow = (title: JobTitle) => {
    if (editingTitleId === title.id) {
      return (
        <div key={title.id} className="flex items-center gap-2 py-2 px-3 bg-muted/50 rounded-md">
          <Input
            value={editTitleName}
            onChange={(e) => setEditTitleName(e.target.value)}
            placeholder="Job title name"
            className="flex-1"
          />
          <Button size="sm" variant="ghost" onClick={() => setEditingTitleId(null)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSaveEditTitle} disabled={saving || !editTitleName.trim()}>
            Save
          </Button>
        </div>
      );
    }

    return (
      <div
        key={title.id}
        className="flex items-center justify-between py-2 px-3 hover:bg-muted/50 rounded-md group"
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{title.name}</p>
          {title.description && (
            <p className="text-xs text-muted-foreground truncate">{title.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Select
            value={title.job_family_id || "unassigned"}
            onValueChange={(value) => handleMoveTitle(title.id, value === "unassigned" ? null : value)}
          >
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <ArrowRight className="h-3 w-3 mr-1" />
              <SelectValue placeholder="Move to..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {jobFamilies.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEditTitle(title)}>
            <Pencil className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteTitleId(title.id)}>
            <Trash2 className="h-3 w-3 text-destructive" />
          </Button>
        </div>
      </div>
    );
  };

  const renderAddTitleForm = (familyId: string | null) => {
    if (addingTitleToFamily !== familyId) return null;

    return (
      <div className="flex items-center gap-2 py-2 px-3 bg-muted/30 rounded-md mt-2">
        <Input
          value={newTitleName}
          onChange={(e) => setNewTitleName(e.target.value)}
          placeholder="New job title name"
          className="flex-1"
          autoFocus
        />
        <Button size="sm" variant="ghost" onClick={() => setAddingTitleToFamily(null)}>
          Cancel
        </Button>
        <Button size="sm" onClick={() => handleAddTitle(familyId)} disabled={saving || !newTitleName.trim()}>
          {saving && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
          Add
        </Button>
      </div>
    );
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
                <CardTitle>Job Families & Titles</CardTitle>
                <CardDescription>
                  Organise job titles into families for better structure
                </CardDescription>
              </div>
            </div>
            {!showAddFamilyForm && (
              <Button onClick={() => setShowAddFamilyForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Family
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Family Form */}
          {showAddFamilyForm && (
            <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">New Job Family</h3>
                <Button variant="ghost" size="icon" onClick={() => setShowAddFamilyForm(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-3">
                <Input
                  placeholder="Job family name (e.g., Clinical, Administrative)"
                  value={newFamilyName}
                  onChange={(e) => setNewFamilyName(e.target.value)}
                />
                <Textarea
                  placeholder="Description (optional)"
                  value={newFamilyDescription}
                  onChange={(e) => setNewFamilyDescription(e.target.value)}
                  rows={2}
                />
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowAddFamilyForm(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddFamily} disabled={saving || !newFamilyName.trim()}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Job Families */}
          {jobFamilies.length === 0 && unassignedTitles.length === 0 && !showAddFamilyForm ? (
            <div className="text-center py-8 text-muted-foreground">
              <FolderTree className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No job families or titles yet</p>
              <p className="text-sm">Create job families to organise your job titles</p>
            </div>
          ) : (
            <div className="space-y-3">
              {jobFamilies.map((family) => (
                <Collapsible
                  key={family.id}
                  open={expandedFamilies.has(family.id)}
                  onOpenChange={() => toggleFamily(family.id)}
                >
                  <div className="border rounded-lg overflow-hidden">
                    {/* Family Header */}
                    {editingFamilyId === family.id ? (
                      <div className="p-4 space-y-3 bg-muted/30">
                        <Input
                          value={editFamilyName}
                          onChange={(e) => setEditFamilyName(e.target.value)}
                          placeholder="Job family name"
                        />
                        <Textarea
                          value={editFamilyDescription}
                          onChange={(e) => setEditFamilyDescription(e.target.value)}
                          placeholder="Description (optional)"
                          rows={2}
                        />
                        <div className="flex gap-2 justify-end">
                          <Button variant="ghost" size="sm" onClick={() => setEditingFamilyId(null)}>
                            Cancel
                          </Button>
                          <Button size="sm" onClick={handleSaveEditFamily} disabled={saving || !editFamilyName.trim()}>
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50">
                          <div className="flex items-center gap-3">
                            {expandedFamilies.has(family.id) ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{family.name}</p>
                                <Badge variant="secondary" className="text-xs">
                                  {family.job_titles.length} title{family.job_titles.length !== 1 ? "s" : ""}
                                </Badge>
                              </div>
                              {family.description && (
                                <p className="text-sm text-muted-foreground">{family.description}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setAddingTitleToFamily(family.id);
                                setExpandedFamilies((prev) => new Set([...prev, family.id]));
                              }}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add Title
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => startEditFamily(family)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeleteFamilyId(family.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </CollapsibleTrigger>
                    )}

                    {/* Family Content (Job Titles) */}
                    <CollapsibleContent>
                      <div className="border-t bg-background px-4 py-2">
                        {family.job_titles.length === 0 && addingTitleToFamily !== family.id ? (
                          <p className="text-sm text-muted-foreground py-2">No job titles in this family</p>
                        ) : (
                          <div className="space-y-1">
                            {family.job_titles.map(renderTitleRow)}
                          </div>
                        )}
                        {renderAddTitleForm(family.id)}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}

              {/* Unassigned Section */}
              {unassignedTitles.length > 0 && (
                <Collapsible defaultOpen>
                  <div className="border rounded-lg overflow-hidden border-dashed">
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50">
                        <div className="flex items-center gap-3">
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-muted-foreground">Unassigned</p>
                              <Badge variant="outline" className="text-xs">
                                {unassignedTitles.length} title{unassignedTitles.length !== 1 ? "s" : ""}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="border-t bg-background px-4 py-2">
                        <div className="space-y-1">
                          {unassignedTitles.map(renderTitleRow)}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Family Dialog */}
      <AlertDialog open={!!deleteFamilyId} onOpenChange={(open) => !open && setDeleteFamilyId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Job Family</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? Job titles in this family will become unassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFamily}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Title Dialog */}
      <AlertDialog open={!!deleteTitleId} onOpenChange={(open) => !open && setDeleteTitleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Job Title</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this job title?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTitle}
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
