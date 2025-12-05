import { Pencil, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Facility } from "./FacilityForm";

interface FacilityListProps {
  facilities: Facility[];
  onEdit: (facility: Facility) => void;
  onDelete: (facility: Facility) => void;
}

export const FacilityList = ({ facilities, onEdit, onDelete }: FacilityListProps) => {
  if (facilities.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">
        No facilities added yet.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {facilities.map((facility) => (
        <div
          key={facility.id}
          className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50"
        >
          <div className="flex items-center gap-3">
            <span className="font-medium text-sm">{facility.name}</span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              {facility.capacity}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onEdit(facility)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onDelete(facility)}
            >
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};
