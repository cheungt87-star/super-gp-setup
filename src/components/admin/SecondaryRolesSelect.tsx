import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SecondaryRole {
  id: string;
  name: string;
}

interface SecondaryRolesSelectProps {
  userId: string;
  organisationId: string;
  currentRoles: SecondaryRole[];
  availableRoles: SecondaryRole[];
  onUpdate: (newRoles: SecondaryRole[]) => void;
}

export function SecondaryRolesSelect({
  userId,
  organisationId,
  currentRoles,
  availableRoles,
  onUpdate,
}: SecondaryRolesSelectProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(currentRoles.map((r) => r.id))
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSelectedIds(new Set(currentRoles.map((r) => r.id)));
  }, [currentRoles]);

  const handleToggle = (roleId: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(roleId);
      } else {
        next.delete(roleId);
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    
    const currentIds = new Set(currentRoles.map((r) => r.id));
    const toAdd = [...selectedIds].filter((id) => !currentIds.has(id));
    const toRemove = [...currentIds].filter((id) => !selectedIds.has(id));

    try {
      // Remove deselected roles
      if (toRemove.length > 0) {
        const { error: removeError } = await supabase
          .from("user_secondary_roles" as any)
          .delete()
          .eq("user_id", userId)
          .in("secondary_role_id", toRemove);

        if (removeError) throw removeError;
      }

      // Add new roles
      if (toAdd.length > 0) {
        const inserts = toAdd.map((roleId) => ({
          user_id: userId,
          secondary_role_id: roleId,
          organisation_id: organisationId,
        }));

        const { error: addError } = await supabase
          .from("user_secondary_roles" as any)
          .insert(inserts as any);

        if (addError) throw addError;
      }

      // Update parent with new roles
      const newRoles = availableRoles.filter((r) => selectedIds.has(r.id));
      onUpdate(newRoles);

      toast({ title: "Secondary roles updated" });
      setOpen(false);
    } catch (error: any) {
      toast({
        title: "Error updating roles",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1">
      {currentRoles.map((role) => (
        <Badge
          key={role.id}
          variant="secondary"
          className="bg-violet-100 text-violet-700 hover:bg-violet-100"
        >
          {role.name}
        </Badge>
      ))}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
            <Plus className="h-3 w-3 mr-1" />
            {currentRoles.length === 0 ? "Add" : "Edit"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <div className="p-3 border-b">
            <p className="text-sm font-medium">Secondary Roles</p>
            <p className="text-xs text-muted-foreground">
              Select lead roles for this user
            </p>
          </div>
          <div className="max-h-48 overflow-y-auto p-2">
            {availableRoles.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2 px-1">
                No secondary roles configured
              </p>
            ) : (
              <div className="space-y-1">
                {availableRoles.map((role) => (
                  <label
                    key={role.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedIds.has(role.id)}
                      onCheckedChange={(checked) =>
                        handleToggle(role.id, !!checked)
                      }
                    />
                    <span className="text-sm">{role.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="border-t p-2 flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}