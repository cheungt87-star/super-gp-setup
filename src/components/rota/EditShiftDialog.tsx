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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
  allShifts?: RotaShift[]; // All shifts for finding linked shift data
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
  const [isOncall, setIsOncall] = useState(false);
  const [notes, setNotes] = useState("");
  const [isTempStaff, setIsTempStaff] = useState(false);
  const [tempConfirmed, setTempConfirmed] = useState(false);

  // Generate time slots at 30-minute intervals
  const generateTimeSlots = (): string[] => {
    const slots: string[] = [];
    let currentMinutes = 6 * 60; // 06:00
    const endMinutes = 23 * 60 + 30; // 23:30
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

  // For linked shifts, compute the combined range
  const linkedShift = useMemo(() => {
    if (!shift?.linked_shift_id) return null;
    return allShifts.find(s => s.id === shift.linked_shift_id) || null;
  }, [shift, allShifts]);

  // Detect if current custom time spans the break
  const showsSpansBreak = useMemo(() => {
    if (shiftType !== "custom" || !customStart || !customEnd || !rotaRules) return false;
    return doesSpanBreak(customStart, customEnd, rotaRules.am_shift_end, rotaRules.pm_shift_start);
  }, [shiftType, customStart, customEnd, rotaRules]);

  // Detect if spans the PM boundary
  const spansBoundary = useMemo(() => {
    if (shiftType !== "custom" || !customStart || !customEnd || !rotaRules) return false;
    const boundary = rotaRules.pm_shift_start.slice(0, 5);
    return customStart < boundary && customEnd > boundary;
  }, [shiftType, customStart, customEnd, rotaRules]);

  useEffect(() => {
    if (shift) {
      // For linked shifts, compute the combined range
      const linked = shift.linked_shift_id ? allShifts.find(s => s.id === shift.linked_shift_id) : null;
      if (linked && shift.shift_type === "custom") {
        // Determine which is AM and which is PM
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
      setIsOncall(shift.is_oncall);
      setNotes(shift.notes || "");
      setIsTempStaff(shift.is_temp_staff || false);
      setTempConfirmed(shift.temp_confirmed || false);
    }
  }, [shift, rotaRules, allShifts]);

  const handleSave = () => {
    onSave({
      shift_type: shiftType,
      custom_start_time: shiftType === "custom" ? customStart : null,
      custom_end_time: shiftType === "custom" ? customEnd : null,
      is_oncall: isOncall,
      notes: notes || null,
      is_temp_staff: isTempStaff,
      temp_confirmed: isTempStaff ? tempConfirmed : false,
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

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label className="text-sm font-medium">On-Call</Label>
              <p className="text-xs text-muted-foreground">
                Mark this staff member as on-call for the day
              </p>
            </div>
            <Switch checked={isOncall} onCheckedChange={setIsOncall} />
          </div>

          {/* Temp Staff Toggle */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label className="text-sm font-medium">Temp/Agency Staff</Label>
              <p className="text-xs text-muted-foreground">
                Mark if covered by locum or agency worker
              </p>
            </div>
            <Switch 
              checked={isTempStaff} 
              onCheckedChange={(checked) => {
                setIsTempStaff(checked);
                if (!checked) setTempConfirmed(false);
              }} 
            />
          </div>

          {isTempStaff && (
            <div className={cn(
              "flex items-center justify-between rounded-lg border p-3",
              !tempConfirmed ? "border-destructive bg-destructive/5" : "border-amber-200 bg-amber-50"
            )}>
              <div>
                <Label className="text-sm font-medium">Booking Confirmed</Label>
                <p className="text-xs text-muted-foreground">
                  Has the temp booking been confirmed?
                </p>
              </div>
              <Switch checked={tempConfirmed} onCheckedChange={setTempConfirmed} />
            </div>
          )}

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
