import { Pencil, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Facility } from "./FacilityForm";

interface FacilityListProps {
  facilities: Facility[];
  onEdit: (facility: Facility) => void;
  onDelete: (facility: Facility) => void;
}

export const FacilityList = ({ facilities, onEdit, onDelete }: FacilityListProps) => {
  if (facilities.length === 0) return null;

  return (
    <div className="rounded-md border">
      {facilities.map((facility, index) => (
        <div
          key={facility.id}
          className={`flex items-center justify-between px-3 py-2 ${
            index !== facilities.length - 1 ? "border-b" : ""
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="font-medium text-sm">{facility.name}</span>
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <Users className="h-3 w-3" />
              <span>{facility.capacity}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onEdit(facility)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
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
