import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input"; // Still used for external temp name
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { User, Clock, Sun, Moon, AlertTriangle, Check, Search } from "lucide-react";
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
  const [searchQuery, setSearchQuery] = useState("");

  const hasFilters = sites && sites.length > 0 && currentSiteId;

  // Generate time slots at 30-minute intervals within a given range
  const generateTimeSlots = (startTime: string, endTime: string, intervalMinutes: number = 30): string[] => {
    const slots: string[] = [];
    const [startHour, startMin] = startTime.split(":").map(Number);
    const [endHour, endMin] = endTime.split(":").map(Number);
    
    let currentMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    while (currentMinutes <= endMinutes) {
      const hours = Math.floor(currentMinutes / 60);
      const mins = currentMinutes % 60;
      slots.push(`${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`);
      currentMinutes += intervalMinutes;
    }
    
    return slots;
  };

  // Determine the period constraints based on shift type
  const periodConstraints = useMemo(() => {
    if (shiftType === "am") {
      return { min: amShiftStart.slice(0, 5), max: amShiftEnd.slice(0, 5), label: "AM" };
    } else if (shiftType === "pm") {
      return { min: pmShiftStart.slice(0, 5), max: pmShiftEnd.slice(0, 5), label: "PM" };
    }
    return null;
  }, [shiftType, amShiftStart, amShiftEnd, pmShiftStart, pmShiftEnd]);

  // Generate valid time slots based on period constraints
  const validTimeSlots = useMemo(() => {
    if (!periodConstraints) return [];
    return generateTimeSlots(periodConstraints.min, periodConstraints.max, 30);
  }, [periodConstraints]);

  // Filter end time options to be after start time
  const validEndTimeSlots = useMemo(() => {
    if (!customStart || !validTimeSlots.length) return validTimeSlots;
    return validTimeSlots.filter(time => time > customStart);
  }, [customStart, validTimeSlots]);

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
      setSearchQuery("");
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
      setSearchQuery("");
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

  // Filter staff based on site, working day, job family, job title, search query, and exclusions
  const filteredStaff = useMemo(() => {
    const applyCommonFilters = (s: StaffMember) => {
      // Exclude already assigned users
      if (excludeUserIds.includes(s.id)) return false;
      
      // If we have dayOfWeek, filter by working days
      if (dayOfWeek) {
        const worksDayKey = dayOfWeek.toLowerCase();
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
      
      // Search by name
      if (searchQuery.trim()) {
        const fullName = `${s.first_name || ""} ${s.last_name || ""}`.toLowerCase();
        if (!fullName.includes(searchQuery.toLowerCase().trim())) {
          return false;
        }
      }
      
      return true;
    };

    // If no allStaff provided, use availableStaff directly (backward compatibility)
    if (!allStaff || !hasFilters) {
      return availableStaff.filter(applyCommonFilters);
    }
    
    // Enhanced filtering with site selection
    const staffPool = allStaff.filter((s: any) => s.primary_site_id === selectedSiteId);
    return staffPool.filter(applyCommonFilters);
  }, [availableStaff, allStaff, selectedSiteId, currentSiteId, excludeUserIds, dayOfWeek, selectedJobTitleId, jobTitleIdsInFamily, hasFilters, searchQuery]);

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
      <DialogContent className="sm:max-w-[48rem] max-h-[90vh] flex flex-col">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <ShiftIcon className={cn("h-5 w-5", shiftDisplay.color)} />
            Add {jobTitleName} - {shiftDisplay.label}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{dateLabel}</p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-5">
          {/* Filters - Row 1: Site, Job Family, Job Title in 3 columns */}
          {hasFilters && (
            <div className="space-y-3 pb-4 border-b">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Site</Label>
                  <Select value={selectedSiteId} onValueChange={(v) => handleFilterChange('site', v)}>
                    <SelectTrigger className="h-9 px-3">
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
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Job Family</Label>
                    <Select value={selectedJobFamilyId} onValueChange={(v) => handleFilterChange('jobFamily', v)}>
                      <SelectTrigger className="h-9 px-3">
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
                {filteredJobTitles && filteredJobTitles.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Job Title</Label>
                    <Select value={selectedJobTitleId} onValueChange={(v) => handleFilterChange('jobTitle', v)}>
                      <SelectTrigger className="h-9 px-3">
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
              {/* Row 2: Search by name */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
            </div>
          )}

          {/* Staff List */}
          {filteredStaff.length === 0 && !isExternalTemp ? (
            <div className="py-8 text-center">
              <User className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">
                No available staff{dayOfWeek ? ` for ${dayOfWeek}` : ""}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Check staff working days in Admin → Users
              </p>
            </div>
          ) : !isExternalTemp && (
            <div className="space-y-3">
              <ScrollArea className="h-[420px]">
                <div className="grid grid-cols-2 gap-3 pr-3">
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
                          "flex items-center gap-2.5 w-full p-2.5 rounded-lg border cursor-pointer transition-colors",
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
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-medium text-base">{fullName}</p>
                            {staff.job_title_name && (
                              <span className={cn("text-xs px-2 py-0.5 rounded border", getJobTitleColors(staff.job_title_name))}>
                                {staff.job_title_name}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                            <Clock className="h-3.5 w-3.5" />
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

          {/* External Temp Staff Option - Now under staff list */}
          {!isExternalTemp && filteredStaff.length > 0 && (
            <div 
              className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-muted-foreground/30 cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => setIsExternalTemp(true)}
            >
              <div className="h-10 w-10 rounded-full flex items-center justify-center bg-orange-100 dark:bg-orange-900/30">
                <User className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-base">Add Temp/Locum Staff</p>
                <p className="text-sm text-muted-foreground">Add external agency or locum staff</p>
              </div>
            </div>
          )}

          {/* External Temp Staff Form - Shows when isExternalTemp is true */}
          {isExternalTemp && (
            <div className="space-y-4 p-4 rounded-lg border border-orange-200 dark:border-orange-900/50 bg-orange-50/50 dark:bg-orange-900/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  <Label className="text-base font-medium">External Agency Staff</Label>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 text-xs"
                  onClick={() => {
                    setIsExternalTemp(false);
                    setExternalTempName("");
                    setTempConfirmed(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="externalTempName" className="text-sm text-muted-foreground">Staff Name</Label>
                <Input
                  id="externalTempName"
                  placeholder="Enter temp staff name..."
                  value={externalTempName}
                  onChange={(e) => setExternalTempName(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Booking Status</Label>
                <RadioGroup 
                  value={tempConfirmed ? "confirmed" : "unconfirmed"} 
                  onValueChange={(v) => setTempConfirmed(v === "confirmed")}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-3 p-2 rounded-md hover:bg-background/50">
                    <RadioGroupItem value="unconfirmed" id="ext_temp_unconfirmed" />
                    <Label htmlFor="ext_temp_unconfirmed" className="text-sm font-normal cursor-pointer text-destructive">
                      Not Confirmed
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 p-2 rounded-md hover:bg-background/50">
                    <RadioGroupItem value="confirmed" id="ext_temp_confirmed" />
                    <Label htmlFor="ext_temp_confirmed" className="text-sm font-normal cursor-pointer text-amber-600">
                      Confirmed
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          )}

          {/* Shift Options - Only show for AM/PM shifts when staff selected */}
          {(selectedStaffId || isExternalTemp) && (showMakeFullDayOption || showCustomTimeOption) && (
            <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Shift Options
              </Label>
              
              {/* Make Full Day Option */}
              {showMakeFullDayOption && (
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="makeFullDay"
                    checked={makeFullDay}
                    onCheckedChange={(checked) => {
                      setMakeFullDay(checked as boolean);
                      if (checked) setUseCustomTime(false);
                    }}
                  />
                  <Label htmlFor="makeFullDay" className="text-sm font-normal cursor-pointer">
                    Make Full Day (adds {oppositeShift} shift too)
                  </Label>
                </div>
              )}
              
              {/* Custom Time Option */}
              {showCustomTimeOption && (
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="useCustomTime"
                      checked={useCustomTime}
                      onCheckedChange={(checked) => {
                        setUseCustomTime(checked as boolean);
                        if (checked) setMakeFullDay(false);
                      }}
                    />
                    <Label htmlFor="useCustomTime" className="text-sm font-normal cursor-pointer">
                      Custom time slot
                    </Label>
                  </div>
                  
                  {useCustomTime && periodConstraints && validTimeSlots.length > 0 && (
                    <div className="grid grid-cols-2 gap-3 pl-6">
                      <div>
                        <Label className="text-xs text-muted-foreground">Start Time</Label>
                        <Select value={customStart} onValueChange={(v) => {
                          setCustomStart(v);
                          // Reset end time if it's now invalid
                          if (customEnd && customEnd <= v) {
                            const nextSlots = validTimeSlots.filter(t => t > v);
                            setCustomEnd(nextSlots.length > 0 ? nextSlots[0] : "");
                          }
                        }}>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Select time" />
                          </SelectTrigger>
                          <SelectContent>
                            {validTimeSlots.slice(0, -1).map((time) => (
                              <SelectItem key={time} value={time}>
                                {time}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">End Time</Label>
                        <Select value={customEnd} onValueChange={setCustomEnd}>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Select time" />
                          </SelectTrigger>
                          <SelectContent>
                            {validEndTimeSlots.map((time) => (
                              <SelectItem key={time} value={time}>
                                {time}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <p className="col-span-2 text-xs text-muted-foreground">
                        {periodConstraints.label} period: {periodConstraints.min} - {periodConstraints.max}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer with Add Button */}
        {(filteredStaff.length > 0 || isExternalTemp) && (
          <DialogFooter className="pt-5 border-t">
            {isExternalTemp ? (
              <Button
                onClick={handleAddExternalTemp}
                disabled={!canAddExternalTemp}
                className="w-full h-11 text-base"
              >
                Add External Temp Staff
              </Button>
            ) : (
              <Button
                onClick={handleAddStaff}
                disabled={!canAddStaff}
                className="w-full h-11 text-base"
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
