import { useState, useMemo } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  AlertTriangle,
  XCircle,
  Clock,
  Building2,
  Users,
  UserX,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { RuleViolation } from "@/lib/rotaRulesEngine";
import type { DayOverride } from "@/hooks/useRotaDayConfirmations";

interface DayConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date;
  violations: RuleViolation[];
  saving: boolean;
  onConfirm: (overrides: DayOverride[]) => void;
  onFix: () => void;
}

interface OverrideState {
  checked: boolean;
  reason: string;
}

export const DayConfirmDialog = ({
  open,
  onOpenChange,
  date,
  violations,
  saving,
  onConfirm,
  onFix,
}: DayConfirmDialogProps) => {
  const [overrides, setOverrides] = useState<Record<number, OverrideState>>({});

  const errorCount = violations.filter((v) => v.severity === "error").length;
  const warningCount = violations.filter((v) => v.severity === "warning").length;

  const allOverridden = useMemo(() => {
    return violations.every((_, i) => {
      const override = overrides[i];
      return override?.checked;
    });
  }, [violations, overrides]);

  const handleOverrideChange = (index: number, checked: boolean) => {
    setOverrides((prev) => ({
      ...prev,
      [index]: { ...prev[index], checked, reason: prev[index]?.reason || "" },
    }));
  };

  const handleReasonChange = (index: number, reason: string) => {
    setOverrides((prev) => ({
      ...prev,
      [index]: { ...prev[index], checked: prev[index]?.checked || false, reason },
    }));
  };

  const handleConfirm = () => {
    const overridesList: DayOverride[] = violations.map((v, i) => ({
      rule_type: v.type,
      rule_description: v.message,
      reason: overrides[i]?.reason || "",
      shift_date: v.dateKey,
      facility_id: v.roomId,
    }));

    onConfirm(overridesList);
  };

  const getViolationIcon = (type: RuleViolation["type"]) => {
    switch (type) {
      case "no_oncall":
        return <Clock className="h-4 w-4" />;
      case "empty_room":
        return <Building2 className="h-4 w-4" />;
      case "cross_site":
        return <Users className="h-4 w-4" />;
      case "temp_not_confirmed":
        return <UserX className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  // Reset overrides when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setOverrides({});
    }
    onOpenChange(newOpen);
  };

  if (violations.length === 0) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm {format(date, "EEEE do MMMM")}</DialogTitle>
            <DialogDescription>
              Review validation results before confirming
            </DialogDescription>
          </DialogHeader>

          <div className="py-6">
            <div className="flex flex-col items-center justify-center gap-3 text-center">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <p className="font-medium text-green-700">All checks passed!</p>
              <p className="text-sm text-muted-foreground">
                This day's schedule is complete and ready to confirm.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={() => onConfirm([])} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Day
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Confirm {format(date, "EEEE do MMMM")}</DialogTitle>
          <DialogDescription>
            Issues found - fix them or provide override reasons
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex flex-col space-y-4">
          {/* Summary */}
          <div className="flex items-center gap-2 text-sm flex-shrink-0">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span className="font-medium">
              {errorCount + warningCount} issue{errorCount + warningCount !== 1 ? "s" : ""} found
            </span>
            {errorCount > 0 && (
              <span className="text-destructive">({errorCount} error{errorCount !== 1 ? "s" : ""})</span>
            )}
          </div>

          {/* Violations List */}
          <div className="flex-1 min-h-0 max-h-[50vh] overflow-y-auto">
            <div className="space-y-3 pr-2">
              {violations.map((v, i) => {
                const override = overrides[i];
                const isChecked = override?.checked || false;
                const reason = override?.reason || "";

                return (
                  <div
                    key={i}
                    className={cn(
                      "rounded-lg border p-3 space-y-2",
                      v.severity === "error"
                        ? "border-destructive/30 bg-destructive/5"
                        : "border-amber-200 bg-amber-50"
                    )}
                  >
                    {/* Violation Message */}
                    <div className="flex items-start gap-2">
                      <div
                        className={cn(
                          "mt-0.5",
                          v.severity === "error" ? "text-destructive" : "text-amber-600"
                        )}
                      >
                        {v.severity === "error" ? (
                          <XCircle className="h-4 w-4" />
                        ) : (
                          getViolationIcon(v.type)
                        )}
                      </div>
                      <span
                        className={cn(
                          "text-sm font-medium",
                          v.severity === "error" ? "text-destructive" : "text-amber-700"
                        )}
                      >
                        {v.message}
                      </span>
                    </div>

                    {/* Override Checkbox */}
                    <div className="flex items-center gap-2 pl-6">
                      <Checkbox
                        id={`override-${i}`}
                        checked={isChecked}
                        onCheckedChange={(checked) =>
                          handleOverrideChange(i, checked === true)
                        }
                      />
                      <Label
                        htmlFor={`override-${i}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        Override this issue
                      </Label>
                    </div>

                    {/* Override Reason */}
                    {isChecked && (
                      <div className="pl-6">
                        <Input
                          placeholder="Reason for override (optional)"
                          value={reason}
                          onChange={(e) => handleReasonChange(i, e.target.value)}
                          className="text-sm"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onFix}>
            Go Back & Fix
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={saving || !allOverridden}
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Override & Confirm Day
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
