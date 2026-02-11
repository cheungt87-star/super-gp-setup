import { useMemo, useState } from "react";
import { format } from "date-fns";
import type { RotaOncall } from "@/hooks/useRotaOncalls";
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
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import {
  AlertTriangle,
  XCircle,
  AlertCircle,
  UserX,
  Building2,
  Clock,
  Users,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RotaShift } from "@/hooks/useRotaSchedule";
import { formatDateKey, calculateShiftHours } from "@/lib/rotaUtils";
import { validateWeek, RuleViolation } from "@/lib/rotaRulesEngine";

interface ClinicRoom {
  id: string;
  name: string;
}

interface StaffMember {
  id: string;
  first_name: string | null;
  last_name: string | null;
  primary_site_id?: string | null;
  contracted_hours?: number | null;
  job_title_name?: string | null;
}

interface OpeningHour {
  day_of_week: number;
  is_closed: boolean;
  am_open_time: string | null;
  am_close_time: string | null;
  pm_open_time: string | null;
  pm_close_time: string | null;
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
  oncalls?: RotaOncall[];
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
  oncalls = [],
  onPublish,
  saving,
}: RotaPreviewDialogProps) => {
  const violations = useMemo(() => {
    return validateWeek(
      weekDays,
      shifts,
      clinicRooms,
      openingHoursByDay,
      allStaff,
      currentSiteId,
      requireOnCall
    );
  }, [shifts, clinicRooms, weekDays, openingHoursByDay, currentSiteId, allStaff, requireOnCall]);

  // State for panels
  const [issuesPanelOpen, setIssuesPanelOpen] = useState(true);
  const [issuesExpanded, setIssuesExpanded] = useState(false);
  const [staffPanelOpen, setStaffPanelOpen] = useState(true);
  
  const INITIAL_ISSUES_SHOWN = 4;
  const visibleViolations = issuesExpanded 
    ? violations 
    : violations.slice(0, INITIAL_ISSUES_SHOWN);
  const hiddenCount = violations.length - INITIAL_ISSUES_SHOWN;

  // Group violations by type for display
  const errorCount = violations.filter((v) => v.severity === "error").length;
  const warningCount = violations.filter((v) => v.severity === "warning").length;

  // Calculate staff hours summary
  const staffHoursSummary = useMemo(() => {
    const staffMap = new Map<string, { scheduledHours: number }>();

    shifts.forEach((shift) => {
      if (!shift.user_id) return;

      // Get day hours for this shift
      const shiftDate = new Date(shift.shift_date);
      const dayOfWeek = shiftDate.getDay();
      const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const dayHours = openingHoursByDay[adjustedDay];

      const openTime = dayHours?.am_open_time || null;
      const closeTime = dayHours?.pm_close_time || null;
      const amStart = dayHours?.am_open_time || "09:00";
      const amEnd = dayHours?.am_close_time || "13:00";
      const pmStart = dayHours?.pm_open_time || "13:00";
      const pmEnd = dayHours?.pm_close_time || "18:00";

      const hours = calculateShiftHours(
        shift.shift_type,
        shift.custom_start_time,
        shift.custom_end_time,
        openTime,
        closeTime,
        amStart,
        amEnd,
        pmStart,
        pmEnd
      );

      const existing = staffMap.get(shift.user_id) || { scheduledHours: 0 };
      staffMap.set(shift.user_id, {
        scheduledHours: existing.scheduledHours + hours,
      });
    });

    return Array.from(staffMap.entries())
      .map(([id, data]) => {
        const staff = allStaff.find((s) => s.id === id);
        const contractedHours = staff?.contracted_hours || 0;
        return {
          id,
          name: `${staff?.first_name || ""} ${staff?.last_name || ""}`.trim() || "Unknown",
          jobTitle: staff?.job_title_name || "",
          scheduledHours: Math.round(data.scheduledHours * 10) / 10,
          contractedHours,
          utilization: contractedHours > 0 ? (data.scheduledHours / contractedHours) * 100 : 0,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [shifts, allStaff, openingHoursByDay]);

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
            (s) => s.shift_type === slotType || s.shift_type === "full_day" || s.shift_type === "custom"
          ).filter((s) => {
            // For custom shifts, check if they overlap with this slot's time range
            if (s.shift_type === "custom" && s.custom_start_time && s.custom_end_time) {
              const dayOfWeek = day.getDay();
              const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
              const dayHours = openingHoursByDay[adjustedDay];
              if (slotType === "am") {
                const amEnd = dayHours?.am_close_time || "13:00";
                return s.custom_start_time < amEnd;
              } else {
                const pmStart = dayHours?.pm_open_time || "13:00";
                return s.custom_end_time > pmStart;
              }
            }
            return true;
          });
          return slotShifts.map((s) => {
            const staff = s.user_id ? allStaff.find((st) => st.id === s.user_id) : null;
            const name = s.is_temp_staff && s.temp_staff_name
              ? s.temp_staff_name
              : staff ? `${staff.first_name || ""} ${staff.last_name || ""}`.trim() : "Unknown";
            return {
              name,
              isTemp: s.is_temp_staff,
              tempConfirmed: s.temp_confirmed,
              isCrossSite: staff?.primary_site_id && staff.primary_site_id !== currentSiteId,
              isCustom: s.shift_type === "custom",
              customTime: s.shift_type === "custom" && s.custom_start_time && s.custom_end_time
                ? `${s.custom_start_time.slice(0, 5)}-${s.custom_end_time.slice(0, 5)}`
                : null,
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

      // Build on-call data from oncalls prop (3 slots, AM/PM each)
      const oncallSlots = [
        { slot: 1, label: "On Call Manager" },
        { slot: 2, label: "On Duty Doctor 1" },
        { slot: 3, label: "On Duty Doctor 2" },
      ].map(({ slot, label }) => {
        const slotOncalls = oncalls.filter(
          (oc) => oc.oncall_date === dateKey && oc.oncall_slot === slot
        );
        const amOncall = slotOncalls.find((oc) => oc.shift_period === "am");
        const pmOncall = slotOncalls.find((oc) => oc.shift_period === "pm");
        return {
          slot,
          label,
          am: amOncall?.user_name || null,
          pm: pmOncall?.user_name || null,
        };
      });

      return {
        date: day,
        dateKey,
        dayLabel: format(day, "EEE d"),
        rooms: roomData,
        oncallSlots,
      };
    });
  }, [weekDays, openingHoursByDay, shifts, clinicRooms, allStaff, currentSiteId, oncalls]);

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

  const getUtilizationColor = (utilization: number) => {
    if (utilization > 100) return "bg-amber-500";
    if (utilization >= 80) return "bg-green-500";
    if (utilization >= 50) return "bg-blue-500";
    return "bg-muted-foreground/30";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] h-[90vh] max-w-[90vw] max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Week Preview</DialogTitle>
          <DialogDescription>
            Review the schedule before publishing
          </DialogDescription>
        </DialogHeader>

        {/* Two-column layout */}
        <div className="flex-1 min-h-0 flex gap-4 overflow-hidden">
          {/* Left: Rota Table */}
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <ScrollArea className="flex-1 border rounded-lg">
              <div className="min-w-[600px]">
                <table className="w-full text-sm table-fixed">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-2 font-medium sticky left-0 bg-muted/50 w-[100px]">
                        Room
                      </th>
                      {weekSummary.map((day) => (
                        <th
                          key={day.dateKey}
                          className="text-center p-2 font-medium w-[120px]"
                        >
                          {day.dayLabel}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* On-Call Rows - 3 slots with AM/PM */}
                    {requireOnCall && [
                      { slot: 1, label: "On Call Manager" },
                      { slot: 2, label: "On Duty Doctor 1" },
                      { slot: 3, label: "On Duty Doctor 2" },
                    ].map(({ slot, label }) => (
                      <tr key={`oncall-${slot}`} className="border-b bg-primary/5">
                        <td className="p-2 font-medium sticky left-0 bg-primary/5">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            <span className="text-xs">{label}</span>
                          </div>
                        </td>
                        {weekSummary.map((day) => {
                          const slotData = day.oncallSlots.find((s) => s.slot === slot);
                          const amName = slotData?.am;
                          const pmName = slotData?.pm;
                          const hasAny = amName || pmName;

                          return (
                            <td key={day.dateKey} className="p-1">
                              <div className="space-y-1">
                                <div className={cn(
                                  "text-xs p-1 rounded",
                                  amName ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-600"
                                )}>
                                  <span className="font-medium">AM:</span>
                                  <span className="ml-1">{amName || "Empty"}</span>
                                </div>
                                <div className={cn(
                                  "text-xs p-1 rounded",
                                  pmName ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-600"
                                )}>
                                  <span className="font-medium">PM:</span>
                                  <span className="ml-1">{pmName || "Empty"}</span>
                                </div>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}

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
                                  <span className="font-medium">AM:</span>
                                  {amStaff.length === 0 ? (
                                    <span className="ml-1">Empty</span>
                                  ) : (
                                    <div className="flex flex-col gap-0.5 mt-0.5">
                                      {amStaff.map((s, i) => (
                                        <div key={i} className="flex items-center gap-0.5 flex-wrap">
                                          <span className="truncate">{s.name}</span>
                                          {s.customTime && (
                                            <Badge variant="outline" className="text-[10px] px-1 py-0 flex-shrink-0 bg-purple-50 text-purple-600 border-purple-200">
                                              ⏱ {s.customTime}
                                            </Badge>
                                          )}
                                          {s.isTemp && (
                                            <Badge
                                              variant={s.tempConfirmed ? "secondary" : "destructive"}
                                              className="text-[10px] px-1 py-0 flex-shrink-0"
                                            >
                                              {s.tempConfirmed ? "T" : "T?"}
                                            </Badge>
                                          )}
                                          {s.isCrossSite && (
                                            <Badge
                                              variant="outline"
                                              className="text-[10px] px-1 py-0 flex-shrink-0"
                                            >
                                              ✱
                                            </Badge>
                                          )}
                                        </div>
                                      ))}
                                    </div>
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
                                  <span className="font-medium">PM:</span>
                                  {pmStaff.length === 0 ? (
                                    <span className="ml-1">Empty</span>
                                  ) : (
                                    <div className="flex flex-col gap-0.5 mt-0.5">
                                      {pmStaff.map((s, i) => (
                                        <div key={i} className="flex items-center gap-0.5 flex-wrap">
                                          <span className="truncate">{s.name}</span>
                                          {s.customTime && (
                                            <Badge variant="outline" className="text-[10px] px-1 py-0 flex-shrink-0 bg-purple-50 text-purple-600 border-purple-200">
                                              ⏱ {s.customTime}
                                            </Badge>
                                          )}
                                          {s.isTemp && (
                                            <Badge
                                              variant={s.tempConfirmed ? "secondary" : "destructive"}
                                              className="text-[10px] px-1 py-0 flex-shrink-0"
                                            >
                                              {s.tempConfirmed ? "T" : "T?"}
                                            </Badge>
                                          )}
                                          {s.isCrossSite && (
                                            <Badge
                                              variant="outline"
                                              className="text-[10px] px-1 py-0 flex-shrink-0"
                                            >
                                              ✱
                                            </Badge>
                                          )}
                                        </div>
                                      ))}
                                    </div>
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

            {/* Legend - below table */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-3">
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

          {/* Right: Sidebar with warnings + staff hours */}
          <div className="w-80 flex flex-col gap-3 overflow-hidden">
            {/* Warnings Panel */}
            <Collapsible open={issuesPanelOpen} onOpenChange={setIssuesPanelOpen}>
              <div className="border rounded-lg bg-muted/30">
                <CollapsibleTrigger asChild>
                  <button className="flex items-center gap-2 w-full p-3 hover:bg-muted/50 transition-colors rounded-lg">
                    <ChevronRight className={cn(
                      "h-4 w-4 transition-transform flex-shrink-0",
                      issuesPanelOpen && "rotate-90"
                    )} />
                    {violations.length > 0 ? (
                      <>
                        <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                        <span className="font-medium text-sm">
                          {errorCount + warningCount} Issue{errorCount + warningCount !== 1 ? "s" : ""}
                        </span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span className="font-medium text-sm text-green-700">All checks passed</span>
                      </>
                    )}
                    {errorCount > 0 && (
                      <Badge variant="destructive" className="ml-auto text-xs">
                        {errorCount}
                      </Badge>
                    )}
                    {warningCount > 0 && (
                      <Badge variant="secondary" className={cn(
                        "text-xs bg-amber-100 text-amber-700 border-amber-200",
                        errorCount === 0 && "ml-auto"
                      )}>
                        {warningCount}
                      </Badge>
                    )}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  {violations.length > 0 && (
                    <div className="max-h-[40vh] overflow-y-auto">
                      <div className="px-3 pb-3 space-y-1.5">
                        {visibleViolations.map((v, i) => (
                          <div
                            key={i}
                            className={cn(
                              "flex items-start gap-2 text-xs py-1 px-2 rounded",
                              v.severity === "error"
                                ? "bg-destructive/10 text-destructive"
                                : "bg-amber-50 text-amber-700"
                            )}
                          >
                            {v.severity === "error" ? (
                              <XCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                            ) : (
                              <span className="flex-shrink-0 mt-0.5">{getViolationIcon(v.type)}</span>
                            )}
                            <span className="leading-tight">{v.message}</span>
                          </div>
                        ))}
                        {hiddenCount > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-1 w-full text-xs h-7"
                            onClick={() => setIssuesExpanded(!issuesExpanded)}
                          >
                            {issuesExpanded ? (
                              <>
                                Show less
                                <ChevronUp className="ml-1 h-3 w-3" />
                              </>
                            ) : (
                              <>
                                Show {hiddenCount} more
                                <ChevronDown className="ml-1 h-3 w-3" />
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </CollapsibleContent>
              </div>
            </Collapsible>

            {/* Staff Hours Panel */}
            <Collapsible open={staffPanelOpen} onOpenChange={setStaffPanelOpen} className="flex-1 flex flex-col min-h-0">
              <div className="border rounded-lg flex-1 flex flex-col overflow-hidden">
                <CollapsibleTrigger asChild>
                  <button className="flex items-center gap-2 w-full p-3 hover:bg-muted/50 transition-colors rounded-t-lg">
                    <ChevronRight className={cn(
                      "h-4 w-4 transition-transform flex-shrink-0",
                      staffPanelOpen && "rotate-90"
                    )} />
                    <Users className="h-4 w-4 flex-shrink-0" />
                    <span className="font-medium text-sm">Staff Hours</span>
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {staffHoursSummary.length}
                    </Badge>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="flex-1 overflow-hidden">
                  <ScrollArea className="h-full max-h-[calc(90vh-350px)]">
                    <div className="px-3 pb-3 space-y-2">
                      {staffHoursSummary.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2">No staff scheduled</p>
                      ) : (
                        staffHoursSummary.map((staff) => (
                          <div key={staff.id} className="p-2 border rounded-md bg-background">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="font-medium text-sm truncate">{staff.name}</div>
                                {staff.jobTitle && (
                                  <div className="text-xs text-muted-foreground truncate">{staff.jobTitle}</div>
                                )}
                              </div>
                              <div className="text-right flex-shrink-0">
                                <div className="text-sm font-medium">
                                  {staff.scheduledHours}h
                                  {staff.contractedHours > 0 && (
                                    <span className="text-muted-foreground font-normal">
                                      /{staff.contractedHours}h
                                    </span>
                                  )}
                                </div>
                                {staff.contractedHours > 0 && (
                                  <div className={cn(
                                    "text-xs",
                                    staff.utilization > 100 ? "text-amber-600" : "text-muted-foreground"
                                  )}>
                                    {Math.round(staff.utilization)}%
                                  </div>
                                )}
                              </div>
                            </div>
                            {staff.contractedHours > 0 && (
                              <Progress 
                                value={Math.min(staff.utilization, 100)} 
                                className="h-1.5 mt-2"
                              />
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CollapsibleContent>
              </div>
            </Collapsible>
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
