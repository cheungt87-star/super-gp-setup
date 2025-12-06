import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { Database } from "@/integrations/supabase/types";
import type { RotaShift } from "@/hooks/useRotaSchedule";

type ShiftType = Database["public"]["Enums"]["shift_type"];

interface EditShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shift: RotaShift | null;
  rotaRules: {
    am_shift_start: string;
    am_shift_end: string;
    pm_shift_start: string;
    pm_shift_end: string;
  } | null;
  onSave: (updates: {
    shift_type: ShiftType;
    custom_start_time: string | null;
    custom_end_time: string | null;
    is_oncall: boolean;
    notes: string | null;
  }) => void;
}

export const EditShiftDialog = ({
  open,
  onOpenChange,
  shift,
  rotaRules,
  onSave,
}: EditShiftDialogProps) => {
  const [shiftType, setShiftType] = useState<ShiftType>("full_day");
  const [customStart, setCustomStart] = useState("09:00");
  const [customEnd, setCustomEnd] = useState("17:00");
  const [isOncall, setIsOncall] = useState(false);
  const [notes, setNotes] = useState("");

  // Determine original period (AM or PM) based on shift data
  const originalPeriod = useMemo(() => {
    if (!shift) return null;
    if (shift.shift_type === "am") return "am";
    if (shift.shift_type === "pm") return "pm";
    if (shift.shift_type === "custom" && shift.custom_start_time) {
      // Determine period based on start time
      const startHour = parseInt(shift.custom_start_time.slice(0, 2));
      return startHour < 13 ? "am" : "pm";
    }
    return null;
  }, [shift]);

  // Period constraints for custom time editing
  const periodConstraints = useMemo(() => {
    if (!rotaRules || !originalPeriod) return null;
    if (originalPeriod === "am") {
      return { 
        min: rotaRules.am_shift_start.slice(0, 5), 
        max: rotaRules.am_shift_end.slice(0, 5),
        label: "AM"
      };
    } else if (originalPeriod === "pm") {
      return { 
        min: rotaRules.pm_shift_start.slice(0, 5), 
        max: rotaRules.pm_shift_end.slice(0, 5),
        label: "PM"
      };
    }
    return null;
  }, [rotaRules, originalPeriod]);

  useEffect(() => {
    if (shift) {
      setShiftType(shift.shift_type);
      setCustomStart(shift.custom_start_time?.slice(0, 5) || rotaRules?.am_shift_start.slice(0, 5) || "09:00");
      setCustomEnd(shift.custom_end_time?.slice(0, 5) || rotaRules?.pm_shift_end.slice(0, 5) || "17:00");
      setIsOncall(shift.is_oncall);
      setNotes(shift.notes || "");
    }
  }, [shift, rotaRules]);

  const handleSave = () => {
    onSave({
      shift_type: shiftType,
      custom_start_time: shiftType === "custom" ? customStart : null,
      custom_end_time: shiftType === "custom" ? customEnd : null,
      is_oncall: isOncall,
      notes: notes || null,
    });
  };

  // Validation
  const isTimeValid = shiftType !== "custom" || (customStart && customEnd && customStart < customEnd);

  if (!shift) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Shift</DialogTitle>
          <DialogDescription>
            {shift.user_name} - {shift.shift_date}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <Label>Shift Type</Label>
            <RadioGroup
              value={shiftType}
              onValueChange={(v) => setShiftType(v as ShiftType)}
              className="grid gap-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="full_day" id="edit_full_day" />
                <Label htmlFor="edit_full_day" className="font-normal cursor-pointer">
                  Full Day (per opening hours)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="am" id="edit_am" />
                <Label htmlFor="edit_am" className="font-normal cursor-pointer">
                  AM Shift {rotaRules && `(${rotaRules.am_shift_start.slice(0, 5)} - ${rotaRules.am_shift_end.slice(0, 5)})`}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pm" id="edit_pm" />
                <Label htmlFor="edit_pm" className="font-normal cursor-pointer">
                  PM Shift {rotaRules && `(${rotaRules.pm_shift_start.slice(0, 5)} - ${rotaRules.pm_shift_end.slice(0, 5)})`}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="edit_custom" />
                <Label htmlFor="edit_custom" className="font-normal cursor-pointer">
                  Custom Time
                </Label>
              </div>
            </RadioGroup>
          </div>

          {shiftType === "custom" && (
            <div className="space-y-2 pl-6">
              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  min={periodConstraints?.min}
                  max={periodConstraints?.max}
                  className="w-32"
                />
                <span className="text-muted-foreground">to</span>
                <Input
                  type="time"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  min={periodConstraints?.min}
                  max={periodConstraints?.max}
                  className="w-32"
                />
              </div>
              {periodConstraints && (
                <p className="text-xs text-muted-foreground">
                  Must be within {periodConstraints.label} period: {periodConstraints.min} - {periodConstraints.max}
                </p>
              )}
              {!isTimeValid && (
                <p className="text-xs text-destructive">
                  End time must be after start time
                </p>
              )}
            </div>
          )}

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label className="text-sm font-medium">On-Call</Label>
              <p className="text-xs text-muted-foreground">
                Mark this staff member as on-call for the day
              </p>
            </div>
            <Switch checked={isOncall} onCheckedChange={setIsOncall} />
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this shift..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!isTimeValid}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
