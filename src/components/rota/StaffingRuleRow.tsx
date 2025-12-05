import { useState } from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Check, X, Loader2 } from "lucide-react";

interface StaffingRule {
  id: string;
  job_title_name?: string;
  min_staff: number;
  max_staff: number | null;
}

interface StaffingRuleRowProps {
  rule: StaffingRule;
  onUpdate: (id: string, minStaff: number, maxStaff: number | null) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}

export const StaffingRuleRow = ({ rule, onUpdate, onDelete }: StaffingRuleRowProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [minStaff, setMinStaff] = useState(rule.min_staff);
  const [maxStaff, setMaxStaff] = useState<number | null>(rule.max_staff);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    const success = await onUpdate(rule.id, minStaff, maxStaff);
    setIsSaving(false);
    if (success) {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setMinStaff(rule.min_staff);
    setMaxStaff(rule.max_staff);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete(rule.id);
    setIsDeleting(false);
  };

  if (isEditing) {
    return (
      <TableRow>
        <TableCell className="font-medium">{rule.job_title_name}</TableCell>
        <TableCell>
          <Input
            type="number"
            min={0}
            value={minStaff}
            onChange={(e) => setMinStaff(parseInt(e.target.value) || 0)}
            className="w-20"
          />
        </TableCell>
        <TableCell>
          <Input
            type="number"
            min={0}
            value={maxStaff ?? ""}
            onChange={(e) => setMaxStaff(e.target.value ? parseInt(e.target.value) : null)}
            placeholder="∞"
            className="w-20"
          />
        </TableCell>
        <TableCell>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            </Button>
            <Button size="icon" variant="ghost" onClick={handleCancel} disabled={isSaving}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow>
      <TableCell className="font-medium">{rule.job_title_name}</TableCell>
      <TableCell>{rule.min_staff}</TableCell>
      <TableCell>{rule.max_staff ?? "∞"}</TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" onClick={() => setIsEditing(true)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};
