import { useMemo } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertTriangle,
  XCircle,
  AlertCircle,
  UserX,
  Building2,
  Clock,
  Users,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RotaShift } from "@/hooks/useRotaSchedule";
import { formatDateKey } from "@/lib/rotaUtils";

interface ClinicRoom {
  id: string;
  name: string;
}

interface StaffMember {
  id: string;
  first_name: string | null;
  last_name: string | null;
  primary_site_id?: string | null;
}

interface OpeningHour {
  day_of_week: number;
  is_closed: boolean;
  am_open_time: string | null;
  am_close_time: string | null;
  pm_open_time: string | null;
  pm_close_time: string | null;
}

interface RuleViolation {
  type: "no_oncall" | "empty_room" | "cross_site" | "incomplete_day" | "temp_not_confirmed";
  severity: "error" | "warning";
  day: string;
  room?: string;
  slot?: string;
  staffName?: string;
  message: string;
}

interface RotaPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shifts: RotaShift[];
  clinicRooms: ClinicRoom[];
  weekDays: Date[];
  openingHoursByDay: Record<number, OpeningHour>;
  currentSiteId: string;
  allStaff: StaffMember[];
  requireOnCall: boolean;
  onPublish?: () => void;
  saving?: boolean;
}

export const RotaPreviewDialog = ({
  open,
  onOpenChange,
  shifts,
  clinicRooms,
  weekDays,
  openingHoursByDay,
  currentSiteId,
  allStaff,
  requireOnCall,
  onPublish,
  saving,
}: RotaPreviewDialogProps) => {
  // Run rules engine to detect violations
  const violations = useMemo(() => {
    const results: RuleViolation[] = [];

    weekDays.forEach((day) => {
      const dayOfWeek = day.getDay();
      const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const dayHours = openingHoursByDay[adjustedDay];
      const isClosed = dayHours?.is_closed ?? true;

      if (isClosed) return;

      const dateKey = formatDateKey(day);
      const dayLabel = format(day, "EEEE do");
      const dayShifts = shifts.filter((s) => s.shift_date === dateKey);

      // Rule 1: No on-call chosen
      if (requireOnCall) {
        const hasOnCall = dayShifts.some((s) => s.is_oncall);
        if (!hasOnCall) {
          results.push({
            type: "no_oncall",
            severity: "error",
            day: dayLabel,
            message: `No on-call assigned for ${dayLabel}`,
          });
        }
      }

      // Rule 2: Rooms left empty (check AM and PM coverage)
      clinicRooms.forEach((room) => {
        const roomShifts = dayShifts.filter((s) => s.facility_id === room.id && !s.is_oncall);
        const hasAM = roomShifts.some((s) => s.shift_type === "am" || s.shift_type === "full_day");
        const hasPM = roomShifts.some((s) => s.shift_type === "pm" || s.shift_type === "full_day");

        if (!hasAM) {
          results.push({
            type: "empty_room",
            severity: "warning",
            day: dayLabel,
            room: room.name,
            slot: "AM",
            message: `${room.name} is empty for AM on ${dayLabel}`,
          });
        }
        if (!hasPM) {
          results.push({
            type: "empty_room",
            severity: "warning",
            day: dayLabel,
            room: room.name,
            slot: "PM",
            message: `${room.name} is empty for PM on ${dayLabel}`,
          });
        }
      });

      // Rule 3 & 5: Check each shift for cross-site staff and unconfirmed temps
      dayShifts.forEach((shift) => {
        const staffMember = allStaff.find((s) => s.id === shift.user_id);
        const staffName = staffMember
          ? `${staffMember.first_name || ""} ${staffMember.last_name || ""}`.trim()
          : "Unknown";

        // Cross-site staff
        if (staffMember?.primary_site_id && staffMember.primary_site_id !== currentSiteId) {
          const room = clinicRooms.find((r) => r.id === shift.facility_id);
          results.push({
            type: "cross_site",
            severity: "warning",
            day: dayLabel,
            room: room?.name,
            slot: shift.shift_type.toUpperCase(),
            staffName,
            message: `${staffName} is from another site (${dayLabel}${room ? `, ${room.name}` : ""})`,
          });
        }

        // Unconfirmed temp staff
        if (shift.is_temp_staff && !shift.temp_confirmed) {
          const room = clinicRooms.find((r) => r.id === shift.facility_id);
          results.push({
            type: "temp_not_confirmed",
            severity: "error",
            day: dayLabel,
            room: room?.name,
            slot: shift.shift_type === "full_day" ? "Full Day" : shift.shift_type.toUpperCase(),
            staffName,
            message: `Temp not confirmed: ${staffName} on ${dayLabel}, ${shift.shift_type === "full_day" ? "Full Day" : shift.shift_type.toUpperCase()}${room ? `, ${room.name}` : ""}`,
          });
        }
      });
    });

    return results;
  }, [shifts, clinicRooms, weekDays, openingHoursByDay, currentSiteId, allStaff, requireOnCall]);

  // Calculate incomplete days (days with any empty slots)
  const incompleteDays = useMemo(() => {
    const dayIssues: Record<string, number> = {};
    violations.forEach((v) => {
      if (v.type === "empty_room" || v.type === "no_oncall") {
        dayIssues[v.day] = (dayIssues[v.day] || 0) + 1;
      }
    });
    return Object.entries(dayIssues).map(([day, count]) => ({
      day,
      count,
    }));
  }, [violations]);

  // Group violations by type for display
  const errorCount = violations.filter((v) => v.severity === "error").length;
  const warningCount = violations.filter((v) => v.severity === "warning").length;

  // Build week summary data
  const weekSummary = useMemo(() => {
    const openDays = weekDays.filter((day) => {
      const dayOfWeek = day.getDay();
      const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const dayHours = openingHoursByDay[adjustedDay];
      return !(dayHours?.is_closed ?? true);
    });

    return openDays.map((day) => {
      const dateKey = formatDateKey(day);
      const dayShifts = shifts.filter((s) => s.shift_date === dateKey);

      const roomData = clinicRooms.map((room) => {
        const roomShifts = dayShifts.filter((s) => s.facility_id === room.id && !s.is_oncall);
        
        const getStaffForSlot = (slotType: "am" | "pm") => {
          const slotShifts = roomShifts.filter(
            (s) => s.shift_type === slotType || s.shift_type === "full_day"
          );
          return slotShifts.map((s) => {
            const staff = allStaff.find((st) => st.id === s.user_id);
            return {
              name: staff ? `${staff.first_name || ""} ${staff.last_name || ""}`.trim() : "Unknown",
              isTemp: s.is_temp_staff,
              tempConfirmed: s.temp_confirmed,
              isCrossSite: staff?.primary_site_id && staff.primary_site_id !== currentSiteId,
            };
          });
        };

        return {
          roomId: room.id,
          roomName: room.name,
          am: getStaffForSlot("am"),
          pm: getStaffForSlot("pm"),
        };
      });

      const onCallShift = dayShifts.find((s) => s.is_oncall);
      let onCallStaff = null;
      if (onCallShift) {
        const staff = allStaff.find((st) => st.id === onCallShift.user_id);
        onCallStaff = staff
          ? `${staff.first_name || ""} ${staff.last_name || ""}`.trim()
          : "Unknown";
      }

      return {
        date: day,
        dateKey,
        dayLabel: format(day, "EEE d"),
        rooms: roomData,
        onCall: onCallStaff,
      };
    });
  }, [weekDays, openingHoursByDay, shifts, clinicRooms, allStaff, currentSiteId]);

  const getViolationIcon = (type: RuleViolation["type"]) => {
    switch (type) {
      case "no_oncall":
        return <Clock className="h-4 w-4" />;
      case "empty_room":
        return <Building2 className="h-4 w-4" />;
      case "cross_site":
        return <Users className="h-4 w-4" />;
      case "temp_not_confirmed":
        return <UserX className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Week Preview</DialogTitle>
          <DialogDescription>
            Review the schedule before publishing
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Warnings Panel */}
          {violations.length > 0 ? (
            <div className="border rounded-lg p-4 bg-muted/30">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <span className="font-medium">
                  {errorCount + warningCount} Issue{errorCount + warningCount !== 1 ? "s" : ""} Found
                </span>
                {errorCount > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {errorCount} Error{errorCount !== 1 ? "s" : ""}
                  </Badge>
                )}
                {warningCount > 0 && (
                  <Badge variant="secondary" className="ml-2 bg-amber-100 text-amber-700 border-amber-200">
                    {warningCount} Warning{warningCount !== 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
              <ScrollArea className="max-h-32">
                <div className="space-y-1.5">
                  {violations.map((v, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex items-center gap-2 text-sm py-1 px-2 rounded",
                        v.severity === "error"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-amber-50 text-amber-700"
                      )}
                    >
                      {v.severity === "error" ? (
                        <XCircle className="h-4 w-4 flex-shrink-0" />
                      ) : (
                        getViolationIcon(v.type)
                      )}
                      <span>{v.message}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          ) : (
            <div className="border rounded-lg p-4 bg-green-50 flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">All checks passed - schedule is complete</span>
            </div>
          )}

          {/* Week Summary Table */}
          <ScrollArea className="flex-1 border rounded-lg">
            <div className="min-w-[600px]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-2 font-medium sticky left-0 bg-muted/50 min-w-[120px]">
                      Room
                    </th>
                    {weekSummary.map((day) => (
                      <th
                        key={day.dateKey}
                        className="text-center p-2 font-medium min-w-[100px]"
                      >
                        {day.dayLabel}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* On-Call Row */}
                  {requireOnCall && (
                    <tr className="border-b bg-primary/5">
                      <td className="p-2 font-medium sticky left-0 bg-primary/5">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          On-Call
                        </div>
                      </td>
                      {weekSummary.map((day) => (
                        <td key={day.dateKey} className="p-2 text-center">
                          {day.onCall ? (
                            <span className="text-xs">{day.onCall}</span>
                          ) : (
                            <Badge variant="destructive" className="text-xs">
                              Missing
                            </Badge>
                          )}
                        </td>
                      ))}
                    </tr>
                  )}

                  {/* Clinic Room Rows */}
                  {clinicRooms.map((room) => (
                    <tr key={room.id} className="border-b">
                      <td className="p-2 font-medium sticky left-0 bg-background">
                        {room.name}
                      </td>
                      {weekSummary.map((day) => {
                        const roomData = day.rooms.find((r) => r.roomId === room.id);
                        const amStaff = roomData?.am || [];
                        const pmStaff = roomData?.pm || [];

                        return (
                          <td key={day.dateKey} className="p-1">
                            <div className="space-y-1">
                              {/* AM */}
                              <div
                                className={cn(
                                  "text-xs p-1 rounded",
                                  amStaff.length === 0
                                    ? "bg-amber-50 text-amber-600"
                                    : "bg-green-50 text-green-700"
                                )}
                              >
                                <span className="font-medium">AM: </span>
                                {amStaff.length === 0 ? (
                                  "Empty"
                                ) : (
                                  amStaff.map((s, i) => (
                                    <span key={i} className="inline-flex items-center gap-0.5">
                                      {i > 0 && ", "}
                                      {s.name}
                                      {s.isTemp && (
                                        <Badge
                                          variant={s.tempConfirmed ? "secondary" : "destructive"}
                                          className="text-[10px] px-1 py-0 ml-0.5"
                                        >
                                          {s.tempConfirmed ? "T" : "T?"}
                                        </Badge>
                                      )}
                                      {s.isCrossSite && (
                                        <Badge
                                          variant="outline"
                                          className="text-[10px] px-1 py-0 ml-0.5"
                                        >
                                          ✱
                                        </Badge>
                                      )}
                                    </span>
                                  ))
                                )}
                              </div>
                              {/* PM */}
                              <div
                                className={cn(
                                  "text-xs p-1 rounded",
                                  pmStaff.length === 0
                                    ? "bg-amber-50 text-amber-600"
                                    : "bg-green-50 text-green-700"
                                )}
                              >
                                <span className="font-medium">PM: </span>
                                {pmStaff.length === 0 ? (
                                  "Empty"
                                ) : (
                                  pmStaff.map((s, i) => (
                                    <span key={i} className="inline-flex items-center gap-0.5">
                                      {i > 0 && ", "}
                                      {s.name}
                                      {s.isTemp && (
                                        <Badge
                                          variant={s.tempConfirmed ? "secondary" : "destructive"}
                                          className="text-[10px] px-1 py-0 ml-0.5"
                                        >
                                          {s.tempConfirmed ? "T" : "T?"}
                                        </Badge>
                                      )}
                                      {s.isCrossSite && (
                                        <Badge
                                          variant="outline"
                                          className="text-[10px] px-1 py-0 ml-0.5"
                                        >
                                          ✱
                                        </Badge>
                                      )}
                                    </span>
                                  ))
                                )}
                              </div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ScrollArea>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Badge variant="destructive" className="text-[10px] px-1 py-0">T?</Badge>
              Temp not confirmed
            </span>
            <span className="flex items-center gap-1">
              <Badge variant="secondary" className="text-[10px] px-1 py-0">T</Badge>
              Temp confirmed
            </span>
            <span className="flex items-center gap-1">
              <Badge variant="outline" className="text-[10px] px-1 py-0">✱</Badge>
              Cross-site staff
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {onPublish && (
            <Button onClick={onPublish} disabled={saving}>
              Publish Schedule
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
