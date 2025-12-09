import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { User, Clock, Sun, Moon, AlertTriangle, Check } from "lucide-react";
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
  job_family_id?: string | null;
}

interface JobFamily {
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
  jobFamilies?: JobFamily[];
  // AM/PM timing constraints for custom time selection
  amShiftStart?: string;
  amShiftEnd?: string;
  pmShiftStart?: string;
  pmShiftEnd?: string;
  onSelectStaff: (userId: string | null, makeFullDay?: boolean, customStartTime?: string, customEndTime?: string, isTempStaff?: boolean, tempConfirmed?: boolean, tempStaffName?: string) => void;
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
  jobFamilies,
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
  const [selectedJobFamilyId, setSelectedJobFamilyId] = useState<string>("all");
  const [selectedJobTitleId, setSelectedJobTitleId] = useState<string>("all");
  const [isTempStaff, setIsTempStaff] = useState(false);
  const [tempConfirmed, setTempConfirmed] = useState(false);
  const [isExternalTemp, setIsExternalTemp] = useState(false);
  const [externalTempName, setExternalTempName] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);

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
      setIsTempStaff(false);
      setTempConfirmed(false);
      setIsExternalTemp(false);
      setExternalTempName("");
      setSelectedStaffId(null);
    } else {
      // Reset to current site when opening
      setSelectedSiteId(currentSiteId || "");
      setSelectedJobFamilyId("all");
      setSelectedJobTitleId("all");
      setIsTempStaff(false);
      setTempConfirmed(false);
      setIsExternalTemp(false);
      setExternalTempName("");
      setSelectedStaffId(null);
      // Set default custom times to period boundaries
      if (periodConstraints) {
        setCustomStart(periodConstraints.min);
        setCustomEnd(periodConstraints.max);
      }
    }
    onOpenChange(newOpen);
  };

  // Filter job titles by selected job family
  const filteredJobTitles = useMemo(() => {
    if (!jobTitles) return [];
    if (selectedJobFamilyId === "all") return jobTitles;
    return jobTitles.filter(jt => jt.job_family_id === selectedJobFamilyId);
  }, [jobTitles, selectedJobFamilyId]);

  // Get job title IDs in the selected job family (for staff filtering)
  const jobTitleIdsInFamily = useMemo(() => {
    if (selectedJobFamilyId === "all") return null; // No filter
    return filteredJobTitles.map(jt => jt.id);
  }, [selectedJobFamilyId, filteredJobTitles]);

  // Filter staff based on site, working day, job family, job title, and exclusions
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
        
        // Filter by job family
        if (jobTitleIdsInFamily && s.job_title_id && !jobTitleIdsInFamily.includes(s.job_title_id)) return false;
        
        // Filter by job title
        if (selectedJobTitleId !== "all" && s.job_title_id !== selectedJobTitleId) return false;
        
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
      
      // Filter by job family
      if (jobTitleIdsInFamily && s.job_title_id && !jobTitleIdsInFamily.includes(s.job_title_id)) return false;
      
      // Filter by job title if selected
      if (selectedJobTitleId !== "all" && s.job_title_id !== selectedJobTitleId) return false;
      
      return true;
    });
  }, [availableStaff, allStaff, selectedSiteId, currentSiteId, excludeUserIds, dayOfWeek, selectedJobTitleId, jobTitleIdsInFamily, hasFilters]);

  // Reset selected staff when filters change
  const handleFilterChange = (filterType: 'site' | 'jobFamily' | 'jobTitle', value: string) => {
    setSelectedStaffId(null);
    if (filterType === 'site') {
      setSelectedSiteId(value);
    } else if (filterType === 'jobFamily') {
      setSelectedJobFamilyId(value);
      setSelectedJobTitleId("all"); // Reset job title when family changes
    } else {
      setSelectedJobTitleId(value);
    }
  };

  const handleAddStaff = () => {
    if (!selectedStaffId) return;
    
    if (useCustomTime && customStart && customEnd) {
      onSelectStaff(selectedStaffId, false, customStart, customEnd, isTempStaff, isTempStaff ? tempConfirmed : false, undefined);
    } else {
      onSelectStaff(selectedStaffId, makeFullDay, undefined, undefined, isTempStaff, isTempStaff ? tempConfirmed : false, undefined);
    }
    setMakeFullDay(false);
    setUseCustomTime(false);
    setIsTempStaff(false);
    setTempConfirmed(false);
    setSelectedStaffId(null);
    onOpenChange(false);
  };

  const handleAddExternalTemp = () => {
    if (!externalTempName.trim()) {
      return;
    }
    if (useCustomTime && customStart && customEnd) {
      onSelectStaff(null, false, customStart, customEnd, true, tempConfirmed, externalTempName.trim());
    } else {
      onSelectStaff(null, makeFullDay, undefined, undefined, true, tempConfirmed, externalTempName.trim());
    }
    setMakeFullDay(false);
    setUseCustomTime(false);
    setIsExternalTemp(false);
    setExternalTempName("");
    setTempConfirmed(false);
    onOpenChange(false);
  };

  const shiftDisplay = getShiftTypeDisplay(shiftType);
  const ShiftIcon = shiftDisplay.icon;
  const showMakeFullDayOption = (shiftType === "am" || shiftType === "pm") && !useCustomTime;
  const showCustomTimeOption = shiftType === "am" || shiftType === "pm";
  const oppositeShift = shiftType === "am" ? "PM" : "AM";

  // Validate custom times
  const isCustomTimeValid = !useCustomTime || (customStart && customEnd && customStart < customEnd);
  
  // Can add staff: must have staff selected (or external temp) and valid time config
  const canAddStaff = selectedStaffId && isCustomTimeValid && !isExternalTemp;
  const canAddExternalTemp = isExternalTemp && externalTempName.trim() && isCustomTimeValid;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShiftIcon className={cn("h-4 w-4", shiftDisplay.color)} />
            Add {jobTitleName} - {shiftDisplay.label}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{dateLabel}</p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Filters - only show if we have sites and currentSiteId */}
          {hasFilters && (
            <div className="space-y-2 pb-3 border-b">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Site</Label>
                  <Select value={selectedSiteId} onValueChange={(v) => handleFilterChange('site', v)}>
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
                {jobFamilies && jobFamilies.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Job Family</Label>
                    <Select value={selectedJobFamilyId} onValueChange={(v) => handleFilterChange('jobFamily', v)}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        {jobFamilies.map((jf) => (
                          <SelectItem key={jf.id} value={jf.id}>
                            {jf.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              {filteredJobTitles && filteredJobTitles.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Job Title</Label>
                  <Select value={selectedJobTitleId} onValueChange={(v) => handleFilterChange('jobTitle', v)}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {filteredJobTitles.map((jt) => (
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

          {/* Staff List - MOVED BEFORE OPTIONS */}
          {filteredStaff.length === 0 && !isExternalTemp ? (
            <div className="py-6 text-center">
              <User className="mx-auto h-10 w-10 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                No available staff{dayOfWeek ? ` for ${dayOfWeek}` : ""}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Check staff working days in Admin → Users
              </p>
            </div>
          ) : !isExternalTemp && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Select Staff</Label>
              <ScrollArea className="max-h-[180px]">
                <div className="space-y-1.5">
                  {filteredStaff.map((staff) => {
                    const fullName = `${staff.first_name || ""} ${staff.last_name || ""}`.trim() || "Unknown";
                    const hours = scheduledHours[staff.id] || 0;
                    const contracted = staff.contracted_hours || 0;
                    const hoursDisplay = contracted > 0 ? `${hours}/${contracted}h` : `${hours}h`;
                    const isSelected = selectedStaffId === staff.id;

                    return (
                      <div
                        key={staff.id}
                        className={cn(
                          "flex items-center gap-3 w-full p-2.5 rounded-md border cursor-pointer transition-colors",
                          isSelected 
                            ? "border-primary bg-primary/5 ring-1 ring-primary" 
                            : "hover:bg-muted/50 border-border"
                        )}
                        onClick={() => setSelectedStaffId(isSelected ? null : staff.id)}
                      >
                        <div className={cn(
                          "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                          isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                        )}>
                          {isSelected ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <User className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm">{fullName}</p>
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
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Shift Options - MOVED AFTER STAFF LIST */}
          {(filteredStaff.length > 0 || isExternalTemp) && (
            <div className="space-y-3 pt-2 border-t">
              <Label className="text-xs text-muted-foreground">Shift Options</Label>
              
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
                    <div className="flex items-center gap-2 pl-6 flex-wrap">
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

              {/* Temp Staff Option - Only show when staff is selected */}
              {selectedStaffId && (
                <div className="space-y-2 px-1">
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="isTempStaff" 
                      checked={isTempStaff} 
                      onCheckedChange={(checked) => {
                        setIsTempStaff(checked === true);
                        if (!checked) setTempConfirmed(false);
                      }}
                    />
                    <Label htmlFor="isTempStaff" className="text-sm cursor-pointer flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                      Mark as Temp (from staff list)
                    </Label>
                  </div>
                  
                  {isTempStaff && (
                    <RadioGroup 
                      value={tempConfirmed ? "confirmed" : "unconfirmed"} 
                      onValueChange={(v) => setTempConfirmed(v === "confirmed")}
                      className="pl-6 space-y-1"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="unconfirmed" id="temp_unconfirmed" />
                        <Label htmlFor="temp_unconfirmed" className="text-sm font-normal cursor-pointer text-destructive">
                          Not Confirmed
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="confirmed" id="temp_confirmed" />
                        <Label htmlFor="temp_confirmed" className="text-sm font-normal cursor-pointer text-amber-600">
                          Confirmed
                        </Label>
                      </div>
                    </RadioGroup>
                  )}
                </div>
              )}

              {/* External Temp Staff Option */}
              <div className="space-y-2 px-1 pt-2 border-t">
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="isExternalTemp" 
                    checked={isExternalTemp} 
                    onCheckedChange={(checked) => {
                      setIsExternalTemp(checked === true);
                      if (checked) {
                        setIsTempStaff(false);
                        setTempConfirmed(false);
                        setSelectedStaffId(null);
                      }
                      if (!checked) {
                        setExternalTempName("");
                        setTempConfirmed(false);
                      }
                    }}
                  />
                  <Label htmlFor="isExternalTemp" className="text-sm cursor-pointer flex items-center gap-1">
                    <User className="h-3.5 w-3.5 text-orange-500" />
                    Add External Agency Staff
                  </Label>
                </div>
                
                {isExternalTemp && (
                  <div className="pl-6 space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="externalTempName" className="text-xs text-muted-foreground">Staff Name</Label>
                      <Input
                        id="externalTempName"
                        placeholder="Enter temp staff name..."
                        value={externalTempName}
                        onChange={(e) => setExternalTempName(e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <RadioGroup 
                      value={tempConfirmed ? "confirmed" : "unconfirmed"} 
                      onValueChange={(v) => setTempConfirmed(v === "confirmed")}
                      className="space-y-1"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="unconfirmed" id="ext_temp_unconfirmed" />
                        <Label htmlFor="ext_temp_unconfirmed" className="text-sm font-normal cursor-pointer text-destructive">
                          Not Confirmed
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="confirmed" id="ext_temp_confirmed" />
                        <Label htmlFor="ext_temp_confirmed" className="text-sm font-normal cursor-pointer text-amber-600">
                          Confirmed
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer with Add Button */}
        {(filteredStaff.length > 0 || isExternalTemp) && (
          <DialogFooter className="pt-4 border-t">
            {isExternalTemp ? (
              <Button
                onClick={handleAddExternalTemp}
                disabled={!canAddExternalTemp}
                className="w-full"
              >
                Add External Temp Staff
              </Button>
            ) : (
              <Button
                onClick={handleAddStaff}
                disabled={!canAddStaff}
                className="w-full"
              >
                Add Staff
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
