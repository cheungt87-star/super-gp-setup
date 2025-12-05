import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface Option {
  id: string;
  name: string;
}

interface InlineSelectCellProps {
  value: string | null;
  displayValue: string | null;
  options: Option[];
  onSave: (value: string | null) => Promise<void>;
  placeholder?: string;
  className?: string;
}

export const InlineSelectCell = ({
  value,
  displayValue,
  options,
  onSave,
  placeholder = "—",
  className,
}: InlineSelectCellProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [localValue, setLocalValue] = useState<string>(value || "none");

  useEffect(() => {
    setLocalValue(value || "none");
  }, [value]);

  const handleChange = async (newValue: string) => {
    setLocalValue(newValue);
    const actualValue = newValue === "none" ? null : newValue;
    
    if (actualValue === value) {
      setIsEditing(false);
      return;
    }

    setIsEditing(false);
    setIsSaving(true);
    
    try {
      await onSave(actualValue);
    } catch {
      setLocalValue(value || "none");
    } finally {
      setIsSaving(false);
    }
  };

  if (isSaving) {
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  }

  if (isEditing) {
    return (
      <Select
        value={localValue}
        onValueChange={handleChange}
        open={true}
        onOpenChange={(open) => !open && setIsEditing(false)}
      >
        <SelectTrigger className="h-8 w-full min-w-[120px]">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">
            <span className="text-muted-foreground">{placeholder}</span>
          </SelectItem>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <span
      onClick={() => setIsEditing(true)}
      className={cn(
        "cursor-pointer hover:bg-muted/50 px-2 py-1 rounded -mx-2 transition-colors",
        !displayValue && "text-muted-foreground",
        className
      )}
    >
      {displayValue || placeholder}
    </span>
  );
};
