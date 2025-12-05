import { useState } from "react";
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
import type { Database } from "@/integrations/supabase/types";

type ShiftType = Database["public"]["Enums"]["shift_type"];

interface ShiftTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffName: string;
  date: string;
  rotaRules: {
    am_shift_start: string;
    am_shift_end: string;
    pm_shift_start: string;
    pm_shift_end: string;
  } | null;
  onConfirm: (
    shiftType: ShiftType,
    customStart?: string,
    customEnd?: string,
    isOncall?: boolean
  ) => void;
}

export const ShiftTypeDialog = ({
  open,
  onOpenChange,
  staffName,
  date,
  rotaRules,
  onConfirm,
}: ShiftTypeDialogProps) => {
  const [shiftType, setShiftType] = useState<ShiftType>("full_day");
  const [customStart, setCustomStart] = useState("09:00");
  const [customEnd, setCustomEnd] = useState("17:00");
  const [isOncall, setIsOncall] = useState(false);

  const handleConfirm = () => {
    onConfirm(
      shiftType,
      shiftType === "custom" ? customStart : undefined,
      shiftType === "custom" ? customEnd : undefined,
      isOncall
    );
    // Reset for next use
    setShiftType("full_day");
    setCustomStart("09:00");
    setCustomEnd("17:00");
    setIsOncall(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Shift</DialogTitle>
          <DialogDescription>
            Assign {staffName} to work on {date}
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
                <RadioGroupItem value="full_day" id="full_day" />
                <Label htmlFor="full_day" className="font-normal cursor-pointer">
                  Full Day (per opening hours)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="am" id="am" />
                <Label htmlFor="am" className="font-normal cursor-pointer">
                  AM Shift {rotaRules && `(${rotaRules.am_shift_start.slice(0, 5)} - ${rotaRules.am_shift_end.slice(0, 5)})`}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pm" id="pm" />
                <Label htmlFor="pm" className="font-normal cursor-pointer">
                  PM Shift {rotaRules && `(${rotaRules.pm_shift_start.slice(0, 5)} - ${rotaRules.pm_shift_end.slice(0, 5)})`}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="custom" />
                <Label htmlFor="custom" className="font-normal cursor-pointer">
                  Custom Time
                </Label>
              </div>
            </RadioGroup>
          </div>

          {shiftType === "custom" && (
            <div className="flex items-center gap-2 pl-6">
              <Input
                type="time"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-32"
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="time"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-32"
              />
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>Add Shift</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
