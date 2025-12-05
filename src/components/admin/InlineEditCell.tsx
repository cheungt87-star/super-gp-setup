import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface InlineEditCellProps {
  value: string | number | null;
  onSave: (value: string) => Promise<void>;
  type?: "text" | "number";
  placeholder?: string;
  className?: string;
}

export const InlineEditCell = ({
  value,
  onSave,
  type = "text",
  placeholder = "—",
  className,
}: InlineEditCellProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value?.toString() || "");
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (editValue === (value?.toString() || "")) {
      setIsEditing(false);
      return;
    }
    
    setIsSaving(true);
    try {
      await onSave(editValue);
      setIsEditing(false);
    } catch {
      setEditValue(value?.toString() || "");
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setEditValue(value?.toString() || "");
      setIsEditing(false);
    }
  };

  if (isSaving) {
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  }

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        type={type}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className="h-8 w-full min-w-[80px]"
        step={type === "number" ? "0.5" : undefined}
      />
    );
  }

  return (
    <span
      onClick={() => {
        setEditValue(value?.toString() || "");
        setIsEditing(true);
      }}
      className={cn(
        "cursor-pointer hover:bg-muted/50 px-2 py-1 rounded -mx-2 transition-colors",
        !value && "text-muted-foreground",
        className
      )}
    >
      {value ?? placeholder}
    </span>
  );
};
