import { useDraggable } from "@dnd-kit/core";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";

interface StaffMember {
  id: string;
  first_name: string | null;
  last_name: string | null;
  job_title_name: string | null;
  working_days: Record<string, boolean> | null;
  contracted_hours: number | null;
}

interface DraggableStaffCardProps {
  staff: StaffMember;
  scheduledHours: number;
}

export const DraggableStaffCard = ({ staff, scheduledHours }: DraggableStaffCardProps) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: staff.id,
    data: { staff },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const fullName = `${staff.first_name || ""} ${staff.last_name || ""}`.trim() || "Unknown";
  const contracted = staff.contracted_hours || 0;
  const hoursDisplay = contracted > 0 ? `${scheduledHours}/${contracted}h` : `${scheduledHours}h`;

  // Get working days as short string
  const workingDaysStr = staff.working_days
    ? Object.entries(staff.working_days)
        .filter(([_, works]) => works)
        .map(([day]) => day.slice(0, 2).toUpperCase())
        .join(", ")
    : "";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "flex flex-col p-3 rounded-lg border bg-card cursor-grab transition-all shrink-0 w-36",
        "hover:border-primary/50 hover:shadow-sm",
        isDragging && "opacity-50 shadow-lg scale-105"
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <User className="h-3.5 w-3.5 text-primary" />
        </div>
        <p className="font-medium text-sm truncate flex-1">{fullName}</p>
      </div>
      <p className="text-xs text-muted-foreground truncate mb-1">
        {staff.job_title_name || "No title"}
      </p>
      <div className="flex items-center justify-between text-xs">
        <span className={cn(
          "font-medium",
          contracted > 0 && scheduledHours >= contracted && "text-green-600",
          contracted > 0 && scheduledHours > contracted && "text-orange-600"
        )}>
          {hoursDisplay}
        </span>
        {workingDaysStr && (
          <span className="text-muted-foreground truncate ml-1">{workingDaysStr}</span>
        )}
      </div>
    </div>
  );
};
