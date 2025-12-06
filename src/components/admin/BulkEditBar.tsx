import { useState } from "react";
import { X, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { WorkingDays, defaultWorkingDays } from "./InlineWorkingDaysCell";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface FilterOption {
  id: string;
  name: string;
}

type BulkAttribute = "primary_site_id" | "job_title_id" | "contracted_hours" | "working_days" | "role";

interface BulkEditBarProps {
  selectedCount: number;
  sites: FilterOption[];
  jobTitles: FilterOption[];
  onApply: (field: string, value: any) => Promise<void>;
  onDelete: () => Promise<void>;
  onClearSelection: () => void;
}

const dayLabels: { key: keyof WorkingDays; short: string }[] = [
  { key: "mon", short: "M" },
  { key: "tue", short: "T" },
  { key: "wed", short: "W" },
  { key: "thu", short: "T" },
  { key: "fri", short: "F" },
  { key: "sat", short: "S" },
  { key: "sun", short: "S" },
];

export const BulkEditBar = ({
  selectedCount,
  sites,
  jobTitles,
  onApply,
  onDelete,
  onClearSelection,
}: BulkEditBarProps) => {
  const [attribute, setAttribute] = useState<BulkAttribute | "">("");
  const [value, setValue] = useState<string>("");
  const [workingDays, setWorkingDays] = useState<WorkingDays>(defaultWorkingDays);
  const [isApplying, setIsApplying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleApply = async () => {
    if (!attribute) return;

    setIsApplying(true);
    try {
      let finalValue: any = value;
      if (attribute === "working_days") {
        finalValue = workingDays;
      } else if (attribute === "contracted_hours") {
        finalValue = value ? parseFloat(value) : null;
      } else if (value === "") {
        finalValue = null;
      }
      await onApply(attribute, finalValue);
      setAttribute("");
      setValue("");
      setWorkingDays(defaultWorkingDays);
    } finally {
      setIsApplying(false);
    }
  };

  const toggleDay = (day: keyof WorkingDays) => {
    setWorkingDays((prev) => ({ ...prev, [day]: !prev[day] }));
  };

  const renderValueSelector = () => {
    switch (attribute) {
      case "primary_site_id":
        return (
          <Select value={value} onValueChange={setValue}>
            <SelectTrigger className="w-48 h-8 bg-background">
              <SelectValue placeholder="Select site" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              {sites.map((site) => (
                <SelectItem key={site.id} value={site.id}>
                  {site.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "job_title_id":
        return (
          <Select value={value} onValueChange={setValue}>
            <SelectTrigger className="w-48 h-8 bg-background">
              <SelectValue placeholder="Select job title" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              {jobTitles.map((jt) => (
                <SelectItem key={jt.id} value={jt.id}>
                  {jt.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "contracted_hours":
        return (
          <Input
            type="number"
            placeholder="Hours"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-24 h-8"
          />
        );
      case "working_days":
        return (
          <div className="flex gap-1">
            {dayLabels.map(({ key, short }) => (
              <button
                key={key}
                onClick={() => toggleDay(key)}
                className={cn(
                  "text-xs font-medium w-6 h-6 flex items-center justify-center rounded transition-colors",
                  workingDays[key]
                    ? "bg-green-100 text-green-700 hover:bg-green-200"
                    : "bg-red-100 text-red-600 hover:bg-red-200"
                )}
              >
                {short}
              </button>
            ))}
          </div>
        );
      case "role":
        return (
          <Select value={value} onValueChange={setValue}>
            <SelectTrigger className="w-36 h-8 bg-background">
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="staff">Staff</SelectItem>
            </SelectContent>
          </Select>
        );
      default:
        return null;
    }
  };

  const canApply =
    attribute !== "" &&
    (attribute === "working_days" || attribute === "contracted_hours" || value !== "");

  return (
    <div className="flex items-center gap-3 p-3 mb-4 rounded-lg border bg-muted/50 animate-fade-in">
      <span className="text-sm font-medium whitespace-nowrap">
        {selectedCount} selected
      </span>
      <div className="h-4 w-px bg-border" />
      <span className="text-sm text-muted-foreground">Change:</span>
      <Select value={attribute} onValueChange={(v) => { setAttribute(v as BulkAttribute); setValue(""); }}>
        <SelectTrigger className="w-40 h-8 bg-background">
          <SelectValue placeholder="Select field" />
        </SelectTrigger>
        <SelectContent className="bg-popover">
          <SelectItem value="primary_site_id">Site</SelectItem>
          <SelectItem value="job_title_id">Job Title</SelectItem>
          <SelectItem value="contracted_hours">Contracted Hours</SelectItem>
          <SelectItem value="working_days">Working Days</SelectItem>
          <SelectItem value="role">Role</SelectItem>
        </SelectContent>
      </Select>
      {attribute && (
        <>
          <span className="text-sm text-muted-foreground">to</span>
          {renderValueSelector()}
        </>
      )}
      <div className="flex-1" />
      <Button
        size="sm"
        onClick={handleApply}
        disabled={!canApply || isApplying}
        className="h-8"
      >
        {isApplying ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
        Apply
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            size="sm"
            variant="destructive"
            className="h-8"
            disabled={isDeleting}
          >
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}
            Delete
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedCount} user{selectedCount !== 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. {selectedCount === 1 ? 'This user' : 'These users'} will be permanently removed from your organisation.
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
      <Button
        size="sm"
        variant="ghost"
        onClick={onClearSelection}
        className="h-8"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};
