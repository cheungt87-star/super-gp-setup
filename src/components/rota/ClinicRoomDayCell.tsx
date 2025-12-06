import { useState } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Phone, Copy, Sun, Moon, DoorOpen } from "lucide-react";
import { StaffSelectionDialog } from "./StaffSelectionDialog";
import type { RotaShift } from "@/hooks/useRotaSchedule";
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
}

interface ClinicRoomDayCellProps {
  date: Date;
  dateKey: string;
  shifts: RotaShift[];
  openingHours: OpeningHours | null;
  clinicRooms: ClinicRoom[];
  availableStaff: StaffMember[];
  scheduledHours: Record<string, number>;
  requireOnCall: boolean;
  loading?: boolean;
  previousDateKey: string | null;
  amShiftStart?: string;
  amShiftEnd?: string;
  pmShiftStart?: string;
  pmShiftEnd?: string;
  onAddShift: (userId: string, dateKey: string, shiftType: ShiftType, isOnCall: boolean, facilityId?: string) => Promise<void>;
  onDeleteShift: (shiftId: string) => void;
  onEditShift: (shift: RotaShift) => void;
  onRepeatPreviousDay?: (dateKey: string, previousDateKey: string) => Promise<void>;
}

export const ClinicRoomDayCell = ({
  date,
  dateKey,
  shifts,
  openingHours,
  clinicRooms,
  availableStaff,
  scheduledHours,
  requireOnCall,
  loading = false,
  previousDateKey,
  amShiftStart = "09:00",
  amShiftEnd = "13:00",
  pmShiftStart = "13:00",
  pmShiftEnd = "18:00",
  onAddShift,
  onDeleteShift,
  onEditShift,
  onRepeatPreviousDay,
}: ClinicRoomDayCellProps) => {
  const [selectionDialog, setSelectionDialog] = useState<{
    open: boolean;
    facilityId: string;
    facilityName: string;
    shiftType: ShiftType | "oncall";
  } | null>(null);

  const isClosed = openingHours?.is_closed ?? true;
  const dateLabel = format(date, "EEEE, d MMMM");

  // Separate shifts by type
  const onCallShift = shifts.find((s) => s.is_oncall) || null;
  const regularShifts = shifts.filter((s) => !s.is_oncall);
  const amShifts = regularShifts.filter((s) => s.shift_type === "am");
  const pmShifts = regularShifts.filter((s) => s.shift_type === "pm");
  const fullDayShifts = regularShifts.filter((s) => s.shift_type === "full_day");

  // Get user IDs that conflict with a given shift type for a given facility
  const getConflictingUserIds = (targetShiftType: ShiftType | "oncall", facilityId?: string): string[] => {
    if (targetShiftType === "oncall") {
      // On-call doesn't conflict with regular shifts - any staff can be on-call
      return onCallShift ? [onCallShift.user_id] : [];
    }
    
    // For facility-specific shifts, get users already assigned to this facility + period
    const facilityShifts = regularShifts.filter((s) => s.facility_id === facilityId);
    
    if (targetShiftType === "full_day") {
      // Full day in this room - conflicts with any existing assignment in this room
      return facilityShifts.map((s) => s.user_id);
    }
    if (targetShiftType === "am") {
      // AM conflicts with existing AM or Full Day in this room
      return facilityShifts
        .filter((s) => s.shift_type === "am" || s.shift_type === "full_day")
        .map((s) => s.user_id);
    }
    if (targetShiftType === "pm") {
      // PM conflicts with existing PM or Full Day in this room
      return facilityShifts
        .filter((s) => s.shift_type === "pm" || s.shift_type === "full_day")
        .map((s) => s.user_id);
    }
    return [];
  };

  // Get shifts for a specific room and period
  const getShiftsForRoom = (roomId: string, period: "am" | "pm") => {
    const roomShifts = regularShifts.filter((s) => s.facility_id === roomId);
    if (period === "am") {
      return {
        periodShifts: roomShifts.filter((s) => s.shift_type === "am"),
        fullDayShifts: roomShifts.filter((s) => s.shift_type === "full_day"),
      };
    } else {
      return {
        periodShifts: roomShifts.filter((s) => s.shift_type === "pm"),
        fullDayShifts: roomShifts.filter((s) => s.shift_type === "full_day"),
      };
    }
  };

  const handleAddClick = (facilityId: string, facilityName: string, shiftType: ShiftType | "oncall") => {
    setSelectionDialog({ open: true, facilityId, facilityName, shiftType });
  };

  const handleSelectStaff = async (userId: string, makeFullDay?: boolean) => {
    if (!selectionDialog) return;
    const isOnCall = selectionDialog.shiftType === "oncall";
    const actualShiftType: ShiftType = isOnCall ? "full_day" : selectionDialog.shiftType as ShiftType;
    const facilityId = isOnCall ? undefined : selectionDialog.facilityId;
    
    // Add the primary shift
    await onAddShift(userId, dateKey, actualShiftType, isOnCall, facilityId);
    
    // If "Make Full Day" was checked, add the opposite shift too
    if (makeFullDay && !isOnCall && (actualShiftType === "am" || actualShiftType === "pm")) {
      const oppositeShiftType: ShiftType = actualShiftType === "am" ? "pm" : "am";
      await onAddShift(userId, dateKey, oppositeShiftType, false, facilityId);
    }
  };

  const renderShiftCard = (shift: RotaShift, showFullBadge = false) => (
    <div
      key={shift.id}
      className="flex items-center justify-between gap-2 bg-muted/50 rounded-md px-3 py-2 cursor-pointer hover:bg-muted transition-colors"
      onClick={() => onEditShift(shift)}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm truncate">{shift.user_name}</span>
        {shift.job_title_name && (
          <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0">{shift.job_title_name}</Badge>
        )}
        {showFullBadge && (
          <Badge variant="secondary" className="text-[10px] px-1 py-0 shrink-0">Full</Badge>
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
            <span className="text-sm font-medium">{dateLabel}</span>
            {openingHours?.open_time && openingHours?.close_time && (
              <span className="text-sm text-muted-foreground">
                {openingHours.open_time.slice(0, 5)} - {openingHours.close_time.slice(0, 5)}
              </span>
            )}
          </div>
          {previousDateKey && onRepeatPreviousDay && (
            <Button
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => onRepeatPreviousDay(dateKey, previousDateKey)}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy Previous Day
            </Button>
          )}
        </div>
      )}

      {isClosed && (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <p className="text-sm italic">This day is closed</p>
        </div>
      )}

      {!isClosed && (
        <div className="p-4 space-y-4">
          {/* On-Call Row */}
          {requireOnCall && (
            <div className="rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">On-Call</span>
                </div>
                {onCallShift ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {onCallShift.user_name}
                    </span>
                    {onCallShift.job_title_name && (
                      <Badge variant="outline" className="text-[10px]">{onCallShift.job_title_name}</Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 hover:bg-destructive/20"
                      onClick={() => onDeleteShift(onCallShift.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={loading}
                    onClick={() => handleAddClick("", "On-Call Staff", "oncall")}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                )}
              </div>
            </div>
          )}

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
                    <div className="px-4 py-3 flex items-start">
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
                    <div className="px-4 py-3 border-l space-y-2">
                      {amData.periodShifts.map((shift) => renderShiftCard(shift))}
                      {amData.fullDayShifts.map((shift) => renderShiftCard(shift, true))}
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
                    <div className="px-4 py-3 border-l space-y-2">
                      {pmData.periodShifts.map((shift) => renderShiftCard(shift))}
                      {pmData.fullDayShifts.map((shift) => renderShiftCard(shift, true))}
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
          availableStaff={availableStaff}
          excludeUserIds={getConflictingUserIds(selectionDialog.shiftType, selectionDialog.facilityId)}
          scheduledHours={scheduledHours}
          onSelectStaff={handleSelectStaff}
        />
      )}
    </div>
  );
};
