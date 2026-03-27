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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { doesSpanBreak } from "@/lib/rotaUtils";
import type { Database } from "@/integrations/supabase/types";
import type { RotaShift } from "@/hooks/useRotaSchedule";

type ShiftType = Database["public"]["Enums"]["shift_type"];

interface EditShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shift: RotaShift | null;
  allShifts?: RotaShift[];
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
    is_temp_staff: boolean;
    temp_confirmed: boolean;
  }) => void;
}

export const EditShiftDialog = ({
  open,
  onOpenChange,
  shift,
  allShifts = [],
  rotaRules,
  onSave,
}: EditShiftDialogProps) => {
  const [shiftType, setShiftType] = useState<ShiftType>("full_day");
  const [customStart, setCustomStart] = useState("09:00");
  const [customEnd, setCustomEnd] = useState("17:00");

  const generateTimeSlots = (): string[] => {
    const slots: string[] = [];
    let currentMinutes = 6 * 60;
    const endMinutes = 23 * 60 + 30;
    while (currentMinutes <= endMinutes) {
      const hours = Math.floor(currentMinutes / 60);
      const mins = currentMinutes % 60;
      slots.push(`${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`);
      currentMinutes += 30;
    }
    return slots;
  };

  const timeSlots = useMemo(() => generateTimeSlots(), []);
  const validEndSlots = useMemo(() => timeSlots.filter(t => t > customStart), [customStart, timeSlots]);

  const showsSpansBreak = useMemo(() => {
    if (shiftType !== "custom" || !customStart || !customEnd || !rotaRules) return false;
    return doesSpanBreak(customStart, customEnd, rotaRules.am_shift_end, rotaRules.pm_shift_start);
  }, [shiftType, customStart, customEnd, rotaRules]);

  const spansBoundary = useMemo(() => {
    if (shiftType !== "custom" || !customStart || !customEnd || !rotaRules) return false;
    const boundary = rotaRules.pm_shift_start.slice(0, 5);
    return customStart < boundary && customEnd > boundary;
  }, [shiftType, customStart, customEnd, rotaRules]);

  // Current shift label for display
  const currentShiftLabel = useMemo(() => {
    if (!shift || !rotaRules) return "";
    switch (shift.shift_type) {
      case "am":
        return `AM Shift (${rotaRules.am_shift_start.slice(0, 5)} - ${rotaRules.am_shift_end.slice(0, 5)})`;
      case "pm":
        return `PM Shift (${rotaRules.pm_shift_start.slice(0, 5)} - ${rotaRules.pm_shift_end.slice(0, 5)})`;
      case "full_day":
        return `Full Day (${rotaRules.am_shift_start.slice(0, 5)} - ${rotaRules.pm_shift_end.slice(0, 5)})`;
      case "custom":
        return `Custom (${shift.custom_start_time?.slice(0, 5) || "?"} - ${shift.custom_end_time?.slice(0, 5) || "?"})`;
      default:
        return "";
    }
  }, [shift, rotaRules]);

  useEffect(() => {
    if (shift) {
      const linked = shift.linked_shift_id ? allShifts.find(s => s.id === shift.linked_shift_id) : null;
      if (linked && shift.shift_type === "custom") {
        const shiftStart = shift.custom_start_time?.slice(0, 5) || "09:00";
        const linkedStart = linked.custom_start_time?.slice(0, 5) || "09:00";
        const combinedStart = shiftStart < linkedStart ? shiftStart : linkedStart;
        const shiftEnd = shift.custom_end_time?.slice(0, 5) || "17:00";
        const linkedEnd = linked.custom_end_time?.slice(0, 5) || "17:00";
        const combinedEnd = shiftEnd > linkedEnd ? shiftEnd : linkedEnd;
        setCustomStart(combinedStart);
        setCustomEnd(combinedEnd);
      } else {
        setCustomStart(shift.custom_start_time?.slice(0, 5) || rotaRules?.am_shift_start.slice(0, 5) || "09:00");
        setCustomEnd(shift.custom_end_time?.slice(0, 5) || rotaRules?.pm_shift_end.slice(0, 5) || "17:00");
      }
      setShiftType(shift.shift_type);
    }
  }, [shift, rotaRules, allShifts]);

  const handleSave = () => {
    if (!shift) return;
    onSave({
      shift_type: shiftType,
      custom_start_time: shiftType === "custom" ? customStart : null,
      custom_end_time: shiftType === "custom" ? customEnd : null,
      is_oncall: shift.is_oncall,
      notes: shift.notes || null,
      is_temp_staff: shift.is_temp_staff || false,
      temp_confirmed: shift.temp_confirmed || false,
    });
  };

  const isTimeValid = shiftType !== "custom" || (customStart && customEnd && customStart < customEnd);

  if (!shift) return null;

  // Context-aware options based on current shift type
  const originalType = shift.shift_type;

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
          {/* Current shift display */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Current shift:</span>
            <Badge variant="outline" className="text-xs">
              {currentShiftLabel}
            </Badge>
          </div>

          <div className="space-y-3">
            <Label>Change to</Label>
            <RadioGroup
              value={shiftType}
              onValueChange={(v) => setShiftType(v as ShiftType)}
              className="grid gap-2"
            >
              {/* Full Day - show when current is NOT full_day */}
              {originalType !== "full_day" && (
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="full_day" id="edit_full_day" />
                  <Label htmlFor="edit_full_day" className="font-normal cursor-pointer">
                    Make Full Day
                  </Label>
                </div>
              )}

              {/* AM - show when current is NOT am */}
              {originalType !== "am" && (
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="am" id="edit_am" />
                  <Label htmlFor="edit_am" className="font-normal cursor-pointer">
                    {originalType === "full_day" ? "Change to AM only" : "Move to AM"}{" "}
                    {rotaRules && `(${rotaRules.am_shift_start.slice(0, 5)} - ${rotaRules.am_shift_end.slice(0, 5)})`}
                  </Label>
                </div>
              )}

              {/* PM - show when current is NOT pm */}
              {originalType !== "pm" && (
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pm" id="edit_pm" />
                  <Label htmlFor="edit_pm" className="font-normal cursor-pointer">
                    {originalType === "full_day" ? "Change to PM only" : "Move to PM"}{" "}
                    {rotaRules && `(${rotaRules.pm_shift_start.slice(0, 5)} - ${rotaRules.pm_shift_end.slice(0, 5)})`}
                  </Label>
                </div>
              )}

              {/* Custom - always show */}
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
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Start</Label>
                  <Select value={customStart} onValueChange={(v) => {
                    setCustomStart(v);
                    if (customEnd && customEnd <= v) {
                      const next = timeSlots.filter(t => t > v);
                      setCustomEnd(next.length > 0 ? next[0] : "");
                    }
                  }}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.slice(0, -1).map((time) => (
                        <SelectItem key={time} value={time}>{time}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">End</Label>
                  <Select value={customEnd} onValueChange={setCustomEnd}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {validEndSlots.map((time) => (
                        <SelectItem key={time} value={time}>{time}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Time range: 06:00 - 23:30</p>
              {spansBoundary && (
                <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  This will create entries in both AM and PM slots
                </p>
              )}
              {showsSpansBreak && (
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-700">
                  <Clock className="h-3 w-3 mr-1" />
                  Spans Break
                </Badge>
              )}
              {!isTimeValid && (
                <p className="text-xs text-destructive">
                  End time must be after start time
                </p>
              )}
            </div>
          )}
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
