import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { User, Clock, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { getJobTitleColors } from "@/lib/jobTitleColors";
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
  primary_site_id?: string | null;
}

interface Site {
  id: string;
  name: string;
}

interface JobTitle {
  id: string;
  name: string;
}

interface StaffSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobTitleId: string;
  jobTitleName: string;
  shiftType: ShiftType | "oncall";
  dateLabel: string;
  dayOfWeek?: string; // "mon", "tue", "wed", etc.
  availableStaff: StaffMember[]; // Staff from current site
  allStaff?: StaffMember[]; // All staff from organization (optional for backward compat)
  excludeUserIds: string[];
  scheduledHours: Record<string, number>;
  currentSiteId?: string;
  sites?: Site[];
  jobTitles?: JobTitle[];
  // AM/PM timing constraints for custom time selection
  amShiftStart?: string;
  amShiftEnd?: string;
  pmShiftStart?: string;
  pmShiftEnd?: string;
  onSelectStaff: (userId: string, makeFullDay?: boolean, customStartTime?: string, customEndTime?: string) => void;
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
  dayOfWeek,
  availableStaff,
  allStaff,
  excludeUserIds,
  scheduledHours,
  currentSiteId,
  sites,
  jobTitles,
  amShiftStart = "09:00",
  amShiftEnd = "13:00",
  pmShiftStart = "13:00",
  pmShiftEnd = "18:00",
  onSelectStaff,
}: StaffSelectionDialogProps) => {
  const [makeFullDay, setMakeFullDay] = useState(false);
  const [useCustomTime, setUseCustomTime] = useState(false);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [selectedSiteId, setSelectedSiteId] = useState(currentSiteId || "");
  const [selectedJobTitleId, setSelectedJobTitleId] = useState<string>("all");

  const hasFilters = sites && sites.length > 0 && currentSiteId;

  // Determine the period constraints based on shift type
  const periodConstraints = useMemo(() => {
    if (shiftType === "am") {
      return { min: amShiftStart.slice(0, 5), max: amShiftEnd.slice(0, 5), label: "AM" };
    } else if (shiftType === "pm") {
      return { min: pmShiftStart.slice(0, 5), max: pmShiftEnd.slice(0, 5), label: "PM" };
    }
    return null;
  }, [shiftType, amShiftStart, amShiftEnd, pmShiftStart, pmShiftEnd]);

  // Reset filters when dialog opens/closes or site changes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setMakeFullDay(false);
      setUseCustomTime(false);
      setCustomStart("");
      setCustomEnd("");
    } else {
      // Reset to current site when opening
      setSelectedSiteId(currentSiteId || "");
      setSelectedJobTitleId("all");
      // Set default custom times to period boundaries
      if (periodConstraints) {
        setCustomStart(periodConstraints.min);
        setCustomEnd(periodConstraints.max);
      }
    }
    onOpenChange(newOpen);
  };

  // Filter staff based on site, working day, job title, and exclusions
  const filteredStaff = useMemo(() => {
    // If no allStaff provided, use availableStaff directly (backward compatibility)
    if (!allStaff || !hasFilters) {
      // Simple filtering without site/working day if no enhanced filtering
      return availableStaff.filter((s) => {
        // Exclude already assigned users
        if (excludeUserIds.includes(s.id)) return false;
        
        // If we have dayOfWeek, filter by working days
        if (dayOfWeek) {
          const worksDayKey = dayOfWeek.toLowerCase();
          // If working_days is null or has no true values, treat as available any day
          const hasConfiguredDays = s.working_days && Object.values(s.working_days).some(v => v === true);
          if (hasConfiguredDays) {
            const worksThisDay = s.working_days?.[worksDayKey] === true;
            if (!worksThisDay) return false;
          }
        }
        
        return true;
      });
    }
    
    // Enhanced filtering with site selection
    // Filter allStaff by selected site
    const staffPool = allStaff.filter((s: any) => s.primary_site_id === selectedSiteId);
    
    return staffPool.filter((s) => {
      // Exclude already assigned users
      if (excludeUserIds.includes(s.id)) return false;
      
      // Filter by working day
      if (dayOfWeek) {
        const worksDayKey = dayOfWeek.toLowerCase();
        // If working_days is null or has no true values, treat as available any day
        const hasConfiguredDays = s.working_days && Object.values(s.working_days).some(v => v === true);
        if (hasConfiguredDays) {
          const worksThisDay = s.working_days?.[worksDayKey] === true;
          if (!worksThisDay) return false;
        }
      }
      
      // Filter by job title if selected
      if (selectedJobTitleId !== "all" && s.job_title_id !== selectedJobTitleId) return false;
      
      return true;
    });
  }, [availableStaff, allStaff, selectedSiteId, currentSiteId, excludeUserIds, dayOfWeek, selectedJobTitleId, hasFilters]);

  const handleSelect = (userId: string) => {
    if (useCustomTime && customStart && customEnd) {
      onSelectStaff(userId, false, customStart, customEnd);
    } else {
      onSelectStaff(userId, makeFullDay);
    }
    setMakeFullDay(false);
    setUseCustomTime(false);
    onOpenChange(false);
  };

  const shiftDisplay = getShiftTypeDisplay(shiftType);
  const ShiftIcon = shiftDisplay.icon;
  const showMakeFullDayOption = (shiftType === "am" || shiftType === "pm") && !useCustomTime;
  const showCustomTimeOption = shiftType === "am" || shiftType === "pm";
  const oppositeShift = shiftType === "am" ? "PM" : "AM";

  // Validate custom times
  const isCustomTimeValid = !useCustomTime || (customStart && customEnd && customStart < customEnd);

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

        {/* Filters - only show if we have sites and currentSiteId */}
        {hasFilters && (
          <div className="flex gap-2 pb-2 border-b">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground mb-1 block">Site</Label>
              <Select value={selectedSiteId} onValueChange={setSelectedSiteId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select site" />
                </SelectTrigger>
                <SelectContent>
                  {sites?.map((site) => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {jobTitles && jobTitles.length > 0 && (
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground mb-1 block">Job Title</Label>
                <Select value={selectedJobTitleId} onValueChange={setSelectedJobTitleId}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {jobTitles.map((jt) => (
                      <SelectItem key={jt.id} value={jt.id}>
                        {jt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        {filteredStaff.length === 0 ? (
          <div className="py-8 text-center">
            <User className="mx-auto h-12 w-12 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">
              No available staff{dayOfWeek ? ` for ${dayOfWeek}` : ""}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Check staff working days in Admin → Users
            </p>
          </div>
        ) : (
          <>
            {/* Options */}
            <div className="space-y-3 py-2 border-b">
              {showMakeFullDayOption && (
                <div className="flex items-center gap-2 px-1">
                  <Checkbox 
                    id="makeFullDay" 
                    checked={makeFullDay} 
                    onCheckedChange={(checked) => {
                      setMakeFullDay(checked === true);
                      if (checked) setUseCustomTime(false);
                    }}
                  />
                  <Label htmlFor="makeFullDay" className="text-sm cursor-pointer">
                    Make Full Day (add to {oppositeShift} as well)
                  </Label>
                </div>
              )}
              
              {showCustomTimeOption && (
                <div className="space-y-2 px-1">
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="useCustomTime" 
                      checked={useCustomTime} 
                      onCheckedChange={(checked) => {
                        setUseCustomTime(checked === true);
                        if (checked) {
                          setMakeFullDay(false);
                          // Reset to period boundaries
                          if (periodConstraints) {
                            setCustomStart(periodConstraints.min);
                            setCustomEnd(periodConstraints.max);
                          }
                        }
                      }}
                    />
                    <Label htmlFor="useCustomTime" className="text-sm cursor-pointer">
                      Custom Time
                    </Label>
                  </div>
                  
                  {useCustomTime && periodConstraints && (
                    <div className="flex items-center gap-2 pl-6">
                      <Input
                        type="time"
                        value={customStart}
                        onChange={(e) => setCustomStart(e.target.value)}
                        min={periodConstraints.min}
                        max={periodConstraints.max}
                        className="w-28 h-8"
                      />
                      <span className="text-sm text-muted-foreground">to</span>
                      <Input
                        type="time"
                        value={customEnd}
                        onChange={(e) => setCustomEnd(e.target.value)}
                        min={periodConstraints.min}
                        max={periodConstraints.max}
                        className="w-28 h-8"
                      />
                      <span className="text-xs text-muted-foreground">
                        ({periodConstraints.label}: {periodConstraints.min}-{periodConstraints.max})
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

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
                      disabled={useCustomTime && !isCustomTimeValid}
                    >
                      <div className="flex items-center gap-3 w-full">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 text-left">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{fullName}</p>
                            {staff.job_title_name && (
                              <span className={cn("text-xs px-1.5 py-0.5 rounded border", getJobTitleColors(staff.job_title_name))}>
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
