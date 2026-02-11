import { useState } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { getJobTitleColors } from "@/lib/jobTitleColors";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Phone, Copy, Sun, Moon, DoorOpen, Clock, Loader2, Trash2 } from "lucide-react";
import { StaffSelectionDialog } from "./StaffSelectionDialog";
import type { RotaShift } from "@/hooks/useRotaSchedule";
import type { RotaOncall } from "@/hooks/useRotaOncalls";
import type { Database } from "@/integrations/supabase/types";

type ShiftType = Database["public"]["Enums"]["shift_type"];

interface OpeningHours {
  is_closed: boolean;
  open_time: string | null;
  close_time: string | null;
  am_open_time?: string | null;
  am_close_time?: string | null;
  pm_open_time?: string | null;
  pm_close_time?: string | null;
}

interface ClinicRoom {
  id: string;
  name: string;
  capacity: number;
}

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

interface ClinicRoomDayCellProps {
  date: Date;
  dateKey: string;
  shifts: RotaShift[];
  oncalls: RotaOncall[];
  openingHours: OpeningHours | null;
  clinicRooms: ClinicRoom[];
  availableStaff: StaffMember[];
  allStaff: StaffMember[];
  sites: Site[];
  jobTitles: JobTitle[];
  jobFamilies: JobFamily[];
  currentSiteId: string;
  scheduledHours: Record<string, number>;
  requireOnCall: boolean;
  loading?: boolean;
  previousDateKey: string | null;
  isFirstOpenDay?: boolean;
  amShiftStart?: string;
  amShiftEnd?: string;
  pmShiftStart?: string;
  pmShiftEnd?: string;
  onAddShift: (userId: string | null, dateKey: string, shiftType: ShiftType, isOnCall: boolean, facilityId?: string, customStartTime?: string, customEndTime?: string, isTempStaff?: boolean, tempConfirmed?: boolean, tempStaffName?: string, oncallSlot?: number) => Promise<void>;
  onDeleteShift: (shiftId: string) => void;
  onEditShift: (shift: RotaShift) => void;
  onDeleteOncall: (dateKey: string, slot: number, shiftPeriod?: "am" | "pm") => Promise<boolean | void>;
  onRepeatPreviousDay?: (dateKey: string, previousDateKey: string) => Promise<void>;
  onCopyToWholeWeek?: (dateKey: string) => Promise<void>;
  onCopyFromPreviousWeek?: () => Promise<void>;
  onClearAll?: (dateKey: string) => Promise<void>;
  copyingFromPrevWeek?: boolean;
}

export const ClinicRoomDayCell = ({
  date,
  dateKey,
  shifts,
  oncalls,
  openingHours,
  clinicRooms,
  availableStaff,
  allStaff,
  sites,
  jobTitles,
  jobFamilies,
  currentSiteId,
  scheduledHours,
  requireOnCall,
  loading = false,
  previousDateKey,
  isFirstOpenDay = false,
  amShiftStart = "09:00",
  amShiftEnd = "13:00",
  pmShiftStart = "13:00",
  pmShiftEnd = "18:00",
  onAddShift,
  onDeleteShift,
  onEditShift,
  onDeleteOncall,
  onRepeatPreviousDay,
  onCopyToWholeWeek,
  onCopyFromPreviousWeek,
  onClearAll,
  copyingFromPrevWeek = false,
}: ClinicRoomDayCellProps) => {
  const [selectionDialog, setSelectionDialog] = useState<{
    open: boolean;
    facilityId: string;
    facilityName: string;
    shiftType: ShiftType | "oncall";
    oncallSlot?: number;
  } | null>(null);

  const isClosed = openingHours?.is_closed ?? true;
  const dateLabel = format(date, "EEEE, d MMMM");

  // Get on-call for a specific slot from the oncalls prop
  const getOncallForSlot = (slot: number) => oncalls.find((o) => o.oncall_slot === slot) || null;
  const regularShifts = shifts.filter((s) => !s.is_oncall);

  // Check if two time ranges overlap
  const doTimesOverlap = (start1: string, end1: string, start2: string, end2: string): boolean => {
    return start1 < end2 && start2 < end1;
  };

  // Get the effective time range for any shift
  const getShiftTimeRange = (shift: RotaShift): { start: string; end: string } => {
    if (shift.shift_type === "full_day") {
      return { start: amShiftStart, end: pmShiftEnd };
    }
    if (shift.shift_type === "am") {
      return { start: amShiftStart, end: amShiftEnd };
    }
    if (shift.shift_type === "pm") {
      return { start: pmShiftStart, end: pmShiftEnd };
    }
    if (shift.shift_type === "custom" && shift.custom_start_time && shift.custom_end_time) {
      return { start: shift.custom_start_time.slice(0, 5), end: shift.custom_end_time.slice(0, 5) };
    }
    return { start: "00:00", end: "23:59" };
  };

  // Get user IDs that conflict with a given shift type - checks ALL shifts site-wide
  const getConflictingUserIds = (targetShiftType: ShiftType | "oncall", facilityId?: string, customStart?: string, customEnd?: string, oncallSlot?: number): string[] => {
    if (targetShiftType === "oncall" || oncallSlot) {
      // For on-call, no conflicts with room shifts - only exclude users already in that oncall slot+period
      return [];
      const slotOncall = getOncallForSlot(oncallSlot || 1);
      return slotOncall?.user_id ? [slotOncall.user_id] : [];
    }

    // Determine the target time range
    let targetStart: string;
    let targetEnd: string;

    if (targetShiftType === "custom" && customStart && customEnd) {
      targetStart = customStart;
      targetEnd = customEnd;
    } else if (targetShiftType === "full_day") {
      targetStart = amShiftStart;
      targetEnd = pmShiftEnd;
    } else if (targetShiftType === "am") {
      targetStart = amShiftStart;
      targetEnd = amShiftEnd;
    } else if (targetShiftType === "pm") {
      targetStart = pmShiftStart;
      targetEnd = pmShiftEnd;
    } else {
      return [];
    }

    // Check ALL regular shifts (not just same room) for time overlap - filter out external temps with no user_id
    const conflictingUserIds = regularShifts
      .filter((shift) => {
        if (!shift.user_id) return false; // Skip external temps
        const shiftRange = getShiftTimeRange(shift);
        return doTimesOverlap(targetStart, targetEnd, shiftRange.start, shiftRange.end);
      })
      .map((s) => s.user_id)
      .filter((id): id is string => id !== null);

    return [...new Set(conflictingUserIds)];
  };

  // Helper to determine if a custom shift falls in AM period
  const isCustomInAM = (shift: RotaShift): boolean => {
    if (!shift.custom_start_time) return false;
    const startTime = shift.custom_start_time.slice(0, 5);
    return startTime < amShiftEnd;
  };

  // Helper to determine if a custom shift falls in PM period
  const isCustomInPM = (shift: RotaShift): boolean => {
    if (!shift.custom_end_time) return false;
    const endTime = shift.custom_end_time.slice(0, 5);
    return endTime > pmShiftStart;
  };

  // Get shifts for a specific room and period, including custom shifts
  const getShiftsForRoom = (roomId: string, period: "am" | "pm") => {
    const roomShifts = regularShifts.filter((s) => s.facility_id === roomId);
    
    if (period === "am") {
      // Standard AM shifts
      const periodShifts = roomShifts.filter((s) => s.shift_type === "am");
      // Full day shifts (show in both)
      const fullDayShifts = roomShifts.filter((s) => s.shift_type === "full_day");
      // Custom shifts that fall in AM period
      const customShifts = roomShifts.filter((s) => s.shift_type === "custom" && isCustomInAM(s));
      
      return { periodShifts, fullDayShifts, customShifts };
    } else {
      // Standard PM shifts
      const periodShifts = roomShifts.filter((s) => s.shift_type === "pm");
      // Full day shifts (show in both)
      const fullDayShifts = roomShifts.filter((s) => s.shift_type === "full_day");
      // Custom shifts that fall in PM period
      const customShifts = roomShifts.filter((s) => s.shift_type === "custom" && isCustomInPM(s));
      
      return { periodShifts, fullDayShifts, customShifts };
    }
  };

  const handleAddClick = (facilityId: string, facilityName: string, shiftType: ShiftType | "oncall", oncallSlot?: number) => {
    setSelectionDialog({ open: true, facilityId, facilityName, shiftType, oncallSlot });
  };

  const handleSelectStaff = async (userId: string | null, makeFullDay?: boolean, customStartTime?: string, customEndTime?: string, isTempStaff?: boolean, tempConfirmed?: boolean, tempStaffName?: string) => {
    if (!selectionDialog) return;
    const isOnCall = !!selectionDialog.oncallSlot;
    const facilityId = isOnCall ? undefined : selectionDialog.facilityId;
    
    // Determine actual shift type
    let actualShiftType: ShiftType;
    if (customStartTime && customEndTime && !isOnCall) {
      actualShiftType = "custom";
    } else {
      actualShiftType = selectionDialog.shiftType as ShiftType;
    }
    
    // Add the primary shift (with oncallSlot for on-call shifts)
    await onAddShift(userId, dateKey, actualShiftType, isOnCall, facilityId, customStartTime, customEndTime, isTempStaff, tempConfirmed, tempStaffName, selectionDialog.oncallSlot);
    
    // If "Make Full Day" was checked, add the opposite shift too (works for both regular and temp staff)
    if (makeFullDay && (selectionDialog.shiftType === "am" || selectionDialog.shiftType === "pm")) {
      const oppositeShiftType: ShiftType = selectionDialog.shiftType === "am" ? "pm" : "am";
      await onAddShift(userId, dateKey, oppositeShiftType, isOnCall, facilityId, undefined, undefined, isTempStaff, tempConfirmed, tempStaffName, selectionDialog.oncallSlot);
    }
  };

  const renderShiftCard = (shift: RotaShift, showFullBadge = false, isCustom = false) => {
    const isTempUnconfirmed = shift.is_temp_staff && !shift.temp_confirmed;
    const isTempConfirmed = shift.is_temp_staff && shift.temp_confirmed;
    
    return (
      <div
        key={shift.id}
        className={cn(
          "relative flex items-center justify-between gap-2 rounded-md px-3 py-2 cursor-pointer transition-colors min-h-[40px]",
          isTempUnconfirmed && "bg-destructive/10 border-2 border-destructive ring-2 ring-destructive/20",
          isTempConfirmed && "bg-amber-50 border border-amber-300",
          !shift.is_temp_staff && "bg-muted/50 hover:bg-muted"
        )}
        onClick={() => onEditShift(shift)}
      >
        {/* Temp Badge */}
        {shift.is_temp_staff && (
          <Badge 
            variant={isTempUnconfirmed ? "destructive" : "outline"}
            className={cn(
              "absolute -top-2 -left-1 text-[9px] px-1 py-0",
              isTempConfirmed && "bg-amber-100 text-amber-700 border-amber-300"
            )}
          >
            {isTempUnconfirmed ? "⚠️ TEMP" : "✓ Temp"}
          </Badge>
        )}
        
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <span className="text-sm truncate">{shift.user_name}</span>
          {shift.job_title_name && (
            <Badge variant="outline" className={cn("text-[10px] px-1 py-0 shrink-0", getJobTitleColors(shift.job_title_name))}>{shift.job_title_name}</Badge>
          )}
          {showFullBadge && (
            <Badge variant="secondary" className="text-[10px] px-1 py-0 shrink-0">Full</Badge>
          )}
          {isCustom && shift.custom_start_time && shift.custom_end_time && (
            <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0 bg-amber-50 text-amber-700 border-amber-200">
              <Clock className="h-3 w-3 mr-0.5" />
              {shift.custom_start_time.slice(0, 5)}-{shift.custom_end_time.slice(0, 5)}
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 hover:bg-destructive/20 shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onDeleteShift(shift.id);
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  return (
    <div
      className={cn(
        "min-h-[200px] transition-colors",
        isClosed && "bg-muted/30"
      )}
    >
      {/* Header with opening hours and copy button */}
      {!isClosed && (
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/20">
          <div className="flex items-center gap-3">
            {openingHours?.open_time && openingHours?.close_time && (
              <span className="text-sm text-muted-foreground">
                {openingHours.open_time.slice(0, 5)} - {openingHours.close_time.slice(0, 5)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isFirstOpenDay && onCopyFromPreviousWeek && (
              <Button
                variant="outline"
                size="sm"
                disabled={loading || copyingFromPrevWeek}
                onClick={onCopyFromPreviousWeek}
              >
                {copyingFromPrevWeek ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Copy className="h-4 w-4 mr-2" />
                )}
                Copy from Previous Week
              </Button>
            )}
            {isFirstOpenDay && onCopyToWholeWeek && (
              <Button
                variant="outline"
                size="sm"
                disabled={loading || copyingFromPrevWeek}
                onClick={() => onCopyToWholeWeek(dateKey)}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy to Whole Week
              </Button>
            )}
            {previousDateKey && onRepeatPreviousDay && (
              <Button
                variant="outline"
                size="sm"
                disabled={loading || copyingFromPrevWeek}
                onClick={() => onRepeatPreviousDay(dateKey, previousDateKey)}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Previous Day
              </Button>
            )}
            {shifts.length > 0 && onClearAll && (
              <Button
                variant="outline"
                size="sm"
                disabled={loading || copyingFromPrevWeek}
                onClick={() => onClearAll(dateKey)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            )}
          </div>
        </div>
      )}

      {isClosed && (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <p className="text-sm italic">This day is closed</p>
        </div>
      )}

      {!isClosed && (
        <div className="p-4 space-y-4">
          {/* On-Call Rows - 3 slots with AM/PM columns */}
          <div className="rounded-lg border overflow-hidden">
            {/* On-Call Header */}
            <div className="grid grid-cols-[1fr_1fr_1fr] bg-muted/50 border-b">
              <div className="px-4 py-2 font-medium text-sm flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                On-Call
              </div>
              <div className="px-4 py-2 font-medium text-sm flex items-center gap-2 border-l">
                <Sun className="h-4 w-4 text-amber-500" />
                AM ({amShiftStart.slice(0, 5)} - {amShiftEnd.slice(0, 5)})
              </div>
              <div className="px-4 py-2 font-medium text-sm flex items-center gap-2 border-l">
                <Moon className="h-4 w-4 text-indigo-500" />
                PM ({pmShiftStart.slice(0, 5)} - {pmShiftEnd.slice(0, 5)})
              </div>
            </div>

            {[1, 2, 3].map((slot) => {
              const slotLabels: Record<number, string> = {
                1: "On Call Manager",
                2: "On Duty Doctor 1",
                3: "On Duty Doctor 2"
              };
              const slotLabel = slotLabels[slot];
              const amOncall = oncalls.find((o) => o.oncall_slot === slot && o.shift_period === "am") || null;
              const pmOncall = oncalls.find((o) => o.oncall_slot === slot && o.shift_period === "pm") || null;
              
              return (
                <div 
                  key={slot} 
                  className={cn(
                    "grid grid-cols-[1fr_1fr_1fr]",
                    slot !== 3 && "border-b"
                  )}
                >
                  {/* Slot Name */}
                  <div className="px-4 py-3 flex items-start min-h-[60px]">
                    <span className="font-medium text-sm">{slotLabel}</span>
                  </div>

                  {/* AM Column */}
                  <div className="px-4 py-3 border-l space-y-2 min-h-[60px]">
                    {amOncall ? (
                      <div
                        className={cn(
                          "relative flex items-center justify-between gap-2 rounded-md px-3 py-2 min-h-[40px]",
                          amOncall.is_temp_staff && !amOncall.temp_confirmed && "bg-destructive/10 border-2 border-destructive",
                          amOncall.is_temp_staff && amOncall.temp_confirmed && "bg-amber-50 border border-amber-300",
                          !amOncall.is_temp_staff && "bg-muted/50"
                        )}
                      >
                        {amOncall.is_temp_staff && (
                          <Badge 
                            variant={!amOncall.temp_confirmed ? "destructive" : "outline"}
                            className={cn(
                              "absolute -top-2 -left-1 text-[9px] px-1 py-0",
                              amOncall.temp_confirmed && "bg-amber-100 text-amber-700 border-amber-300"
                            )}
                          >
                            {!amOncall.temp_confirmed ? "⚠️ TEMP" : "✓ Temp"}
                          </Badge>
                        )}
                        <span className="text-sm font-medium truncate">{amOncall.user_name}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 hover:bg-destructive/20 shrink-0"
                          onClick={() => onDeleteOncall(dateKey, slot, "am")}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-muted-foreground hover:text-foreground"
                        disabled={loading}
                        onClick={() => handleAddClick("", slotLabel, "am", slot)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add AM
                      </Button>
                    )}
                  </div>

                  {/* PM Column */}
                  <div className="px-4 py-3 border-l space-y-2 min-h-[60px]">
                    {pmOncall ? (
                      <div
                        className={cn(
                          "relative flex items-center justify-between gap-2 rounded-md px-3 py-2 min-h-[40px]",
                          pmOncall.is_temp_staff && !pmOncall.temp_confirmed && "bg-destructive/10 border-2 border-destructive",
                          pmOncall.is_temp_staff && pmOncall.temp_confirmed && "bg-amber-50 border border-amber-300",
                          !pmOncall.is_temp_staff && "bg-muted/50"
                        )}
                      >
                        {pmOncall.is_temp_staff && (
                          <Badge 
                            variant={!pmOncall.temp_confirmed ? "destructive" : "outline"}
                            className={cn(
                              "absolute -top-2 -left-1 text-[9px] px-1 py-0",
                              pmOncall.temp_confirmed && "bg-amber-100 text-amber-700 border-amber-300"
                            )}
                          >
                            {!pmOncall.temp_confirmed ? "⚠️ TEMP" : "✓ Temp"}
                          </Badge>
                        )}
                        <span className="text-sm font-medium truncate">{pmOncall.user_name}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 hover:bg-destructive/20 shrink-0"
                          onClick={() => onDeleteOncall(dateKey, slot, "pm")}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-muted-foreground hover:text-foreground"
                        disabled={loading}
                        onClick={() => handleAddClick("", slotLabel, "pm", slot)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add PM
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Clinic Rooms Table */}
          {clinicRooms.length > 0 ? (
            <div className="rounded-lg border overflow-hidden">
              {/* Table Header */}
              <div className="grid grid-cols-[1fr_1fr_1fr] bg-muted/50 border-b">
                <div className="px-4 py-2 font-medium text-sm flex items-center gap-2">
                  <DoorOpen className="h-4 w-4 text-muted-foreground" />
                  Room
                </div>
                <div className="px-4 py-2 font-medium text-sm flex items-center gap-2 border-l">
                  <Sun className="h-4 w-4 text-amber-500" />
                  AM ({amShiftStart.slice(0, 5)} - {amShiftEnd.slice(0, 5)})
                </div>
                <div className="px-4 py-2 font-medium text-sm flex items-center gap-2 border-l">
                  <Moon className="h-4 w-4 text-indigo-500" />
                  PM ({pmShiftStart.slice(0, 5)} - {pmShiftEnd.slice(0, 5)})
                </div>
              </div>

              {/* Room Rows */}
              {clinicRooms.map((room) => {
                const amData = getShiftsForRoom(room.id, "am");
                const pmData = getShiftsForRoom(room.id, "pm");

                return (
                  <div key={room.id} className="grid grid-cols-[1fr_1fr_1fr] border-b last:border-b-0">
                    {/* Room Name */}
                    <div className="px-4 py-3 flex items-start min-h-[80px]">
                      <div>
                        <span className="font-medium text-sm">{room.name}</span>
                        {room.capacity > 0 && (
                          <span className="text-xs text-muted-foreground ml-2">
                            (cap: {room.capacity})
                          </span>
                        )}
                      </div>
                    </div>

                    {/* AM Column */}
                    <div className="px-4 py-3 border-l space-y-2 min-h-[80px]">
                      {/* Standard AM shifts */}
                      {amData.periodShifts.map((shift) => renderShiftCard(shift))}
                      {/* Full day shifts */}
                      {amData.fullDayShifts.map((shift) => renderShiftCard(shift, true))}
                      {/* Custom partial shifts */}
                      {amData.customShifts.map((shift) => renderShiftCard(shift, false, true))}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-muted-foreground hover:text-foreground"
                        disabled={loading}
                        onClick={() => handleAddClick(room.id, room.name, "am")}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add AM
                      </Button>
                    </div>

                    {/* PM Column */}
                    <div className="px-4 py-3 border-l space-y-2 min-h-[80px]">
                      {/* Standard PM shifts */}
                      {pmData.periodShifts.map((shift) => renderShiftCard(shift))}
                      {/* Full day shifts */}
                      {pmData.fullDayShifts.map((shift) => renderShiftCard(shift, true))}
                      {/* Custom partial shifts */}
                      {pmData.customShifts.map((shift) => renderShiftCard(shift, false, true))}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-muted-foreground hover:text-foreground"
                        disabled={loading}
                        onClick={() => handleAddClick(room.id, room.name, "pm")}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add PM
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 rounded-lg border bg-muted/20">
              <DoorOpen className="mx-auto h-12 w-12 text-muted-foreground/50 mb-2" />
              <p className="text-muted-foreground text-sm">
                No clinic rooms configured for this site.
              </p>
              <p className="text-muted-foreground text-xs mt-1">
                Add them in Site Management → Facilities (type: Clinic Room)
              </p>
            </div>
          )}
        </div>
      )}

      {/* Staff Selection Dialog */}
      {selectionDialog && (
        <StaffSelectionDialog
          open={selectionDialog.open}
          onOpenChange={(open) => !open && setSelectionDialog(null)}
          jobTitleId=""
          jobTitleName={selectionDialog.facilityName}
          shiftType={selectionDialog.shiftType}
          dateLabel={dateLabel}
          dayOfWeek={format(date, "EEE").toLowerCase()}
          availableStaff={availableStaff}
          allStaff={allStaff}
          excludeUserIds={getConflictingUserIds(selectionDialog.shiftType, selectionDialog.facilityId)}
          scheduledHours={scheduledHours}
          currentSiteId={currentSiteId}
          sites={sites}
          jobTitles={jobTitles}
          jobFamilies={jobFamilies}
          amShiftStart={amShiftStart}
          amShiftEnd={amShiftEnd}
          pmShiftStart={pmShiftStart}
          pmShiftEnd={pmShiftEnd}
          onSelectStaff={handleSelectStaff}
        />
      )}
    </div>
  );
};
