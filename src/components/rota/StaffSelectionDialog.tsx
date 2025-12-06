import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { User, Clock, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type ShiftType = Database["public"]["Enums"]["shift_type"];

interface StaffMember {
  id: string;
  first_name: string | null;
  last_name: string | null;
  job_title_id: string | null;
  job_title_name: string | null;
  working_days: Record<string, boolean> | null;
  contracted_hours: number | null;
}

interface StaffSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobTitleId: string;
  jobTitleName: string;
  shiftType: ShiftType | "oncall";
  dateLabel: string;
  availableStaff: StaffMember[];
  excludeUserIds: string[];
  scheduledHours: Record<string, number>;
  onSelectStaff: (userId: string, makeFullDay?: boolean) => void;
}

const getShiftTypeDisplay = (shiftType: ShiftType | "oncall") => {
  switch (shiftType) {
    case "am":
      return { label: "AM Shift", icon: Sun, color: "text-amber-500" };
    case "pm":
      return { label: "PM Shift", icon: Moon, color: "text-indigo-500" };
    case "full_day":
      return { label: "Full Day", icon: Clock, color: "text-muted-foreground" };
    case "oncall":
      return { label: "On-Call", icon: Clock, color: "text-muted-foreground" };
    default:
      return { label: "", icon: Clock, color: "text-muted-foreground" };
  }
};

export const StaffSelectionDialog = ({
  open,
  onOpenChange,
  jobTitleName,
  shiftType,
  dateLabel,
  availableStaff,
  excludeUserIds,
  scheduledHours,
  onSelectStaff,
}: StaffSelectionDialogProps) => {
  const [makeFullDay, setMakeFullDay] = useState(false);

  const filteredStaff = availableStaff.filter(
    (s) => !excludeUserIds.includes(s.id)
  );

  const handleSelect = (userId: string) => {
    onSelectStaff(userId, makeFullDay);
    setMakeFullDay(false);
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setMakeFullDay(false);
    }
    onOpenChange(newOpen);
  };

  const shiftDisplay = getShiftTypeDisplay(shiftType);
  const ShiftIcon = shiftDisplay.icon;
  const showMakeFullDayOption = shiftType === "am" || shiftType === "pm";
  const oppositeShift = shiftType === "am" ? "PM" : "AM";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShiftIcon className={cn("h-4 w-4", shiftDisplay.color)} />
            Add {jobTitleName} - {shiftDisplay.label}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{dateLabel}</p>
        </DialogHeader>

        {filteredStaff.length === 0 ? (
          <div className="py-8 text-center">
            <User className="mx-auto h-12 w-12 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">
              No available {jobTitleName.toLowerCase()} staff
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {availableStaff.length === 0
                ? "No staff with this role are assigned to this site"
                : "All eligible staff are already assigned for this shift"}
            </p>
          </div>
        ) : (
          <>
            {showMakeFullDayOption && (
              <div className="flex items-center gap-2 px-1 py-2 border-b">
                <Checkbox 
                  id="makeFullDay" 
                  checked={makeFullDay} 
                  onCheckedChange={(checked) => setMakeFullDay(checked === true)}
                />
                <Label htmlFor="makeFullDay" className="text-sm cursor-pointer">
                  Make Full Day (add to {oppositeShift} as well)
                </Label>
              </div>
            )}
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-2">
                {filteredStaff.map((staff) => {
                  const fullName = `${staff.first_name || ""} ${staff.last_name || ""}`.trim() || "Unknown";
                  const hours = scheduledHours[staff.id] || 0;
                  const contracted = staff.contracted_hours || 0;
                  const hoursDisplay = contracted > 0 ? `${hours}/${contracted}h` : `${hours}h`;

                  return (
                    <Button
                      key={staff.id}
                      variant="outline"
                      className="w-full justify-start h-auto py-3"
                      onClick={() => handleSelect(staff.id)}
                    >
                      <div className="flex items-center gap-3 w-full">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 text-left">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{fullName}</p>
                            {staff.job_title_name && (
                              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                {staff.job_title_name}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span className={cn(
                              contracted > 0 && hours >= contracted && "text-amber-600"
                            )}>
                              {hoursDisplay} scheduled
                            </span>
                          </div>
                        </div>
                      </div>
                    </Button>
                  );
                })}
              </div>
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};