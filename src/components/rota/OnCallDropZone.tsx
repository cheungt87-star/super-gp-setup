import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { Phone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RotaShift } from "@/hooks/useRotaSchedule";

interface OnCallDropZoneProps {
  dateKey: string;
  onCallShift: RotaShift | null;
  onRemoveOnCall: (shiftId: string) => void;
}

export const OnCallDropZone = ({
  dateKey,
  onCallShift,
  onRemoveOnCall,
}: OnCallDropZoneProps) => {
  const { isOver, setNodeRef } = useDroppable({
    id: `oncall-${dateKey}`,
    data: { dateKey, isOnCall: true },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded border border-dashed p-2 mb-2 transition-colors min-h-[40px]",
        isOver && "border-primary bg-primary/10",
        !isOver && !onCallShift && "border-muted-foreground/30 bg-muted/20",
        onCallShift && "border-amber-500/50 bg-amber-500/10"
      )}
    >
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
        <Phone className="h-3 w-3" />
        <span className="font-medium">On-Call</span>
      </div>
      
      {onCallShift ? (
        <div className="flex items-center justify-between gap-1 bg-amber-500/20 rounded px-2 py-1">
          <span className="text-xs font-medium truncate">
            {onCallShift.user_name}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 hover:bg-destructive/20"
            onClick={(e) => {
              e.stopPropagation();
              onRemoveOnCall(onCallShift.id);
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <div className="text-xs text-muted-foreground/60 text-center py-0.5">
          {isOver ? "Drop here" : "None assigned"}
        </div>
      )}
    </div>
  );
};
