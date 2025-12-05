import { useState, useRef, useEffect } from "react";
import { Pencil, Trash2, Users, Check, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Facility } from "./FacilityForm";

interface FacilityListProps {
  facilities: Facility[];
  onEdit: (facility: Facility) => void;
  onDelete: (facility: Facility) => void;
  onSave?: (name: string, capacity: number, facilityId?: string) => Promise<void>;
  isAdding?: boolean;
  onStartAdd?: () => void;
  onCancelAdd?: () => void;
}

export const FacilityList = ({ 
  facilities, 
  onEdit, 
  onDelete,
  onSave,
  isAdding = false,
  onStartAdd,
  onCancelAdd
}: FacilityListProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCapacity, setEditCapacity] = useState(0);
  const [newName, setNewName] = useState("");
  const [newCapacity, setNewCapacity] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const addInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAdding && addInputRef.current) {
      addInputRef.current.focus();
    }
  }, [isAdding]);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  const handleStartEdit = (facility: Facility) => {
    setEditingId(facility.id);
    setEditName(facility.name);
    setEditCapacity(facility.capacity);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditCapacity(0);
  };

  const handleSaveEdit = async () => {
    if (!editName.trim() || !onSave || !editingId) return;
    setIsSaving(true);
    try {
      await onSave(editName.trim(), editCapacity, editingId);
      setEditingId(null);
      setEditName("");
      setEditCapacity(0);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNew = async () => {
    if (!newName.trim() || !onSave) return;
    setIsSaving(true);
    try {
      await onSave(newName.trim(), newCapacity);
      setNewName("");
      setNewCapacity(0);
      onCancelAdd?.();
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, isNew: boolean) => {
    if (e.key === "Enter") {
      e.preventDefault();
      isNew ? handleSaveNew() : handleSaveEdit();
    } else if (e.key === "Escape") {
      isNew ? onCancelAdd?.() : handleCancelEdit();
    }
  };

  const renderInlineForm = (isNew: boolean, facility?: Facility) => {
    const name = isNew ? newName : editName;
    const capacity = isNew ? newCapacity : editCapacity;
    const setName = isNew ? setNewName : setEditName;
    const setCapacity = isNew ? setNewCapacity : setEditCapacity;
    const onSaveClick = isNew ? handleSaveNew : handleSaveEdit;
    const onCancel = isNew ? onCancelAdd : handleCancelEdit;
    const inputRef = isNew ? addInputRef : editInputRef;

    return (
      <div className="flex items-center gap-2 px-3 py-2">
        <Input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, isNew)}
          placeholder="Facility name"
          className="h-8 flex-1"
          disabled={isSaving}
        />
        <div className="flex items-center gap-1">
          <Users className="h-3 w-3 text-muted-foreground" />
          <Input
            type="number"
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
            onKeyDown={(e) => handleKeyDown(e, isNew)}
            className="h-8 w-16"
            min={0}
            disabled={isSaving}
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-primary"
          onClick={onSaveClick}
          disabled={!name.trim() || isSaving}
        >
          <Check className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onCancel}
          disabled={isSaving}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  };

  const showAddButton = !isAdding && onStartAdd;

  if (facilities.length === 0 && !isAdding && !showAddButton) return null;

  return (
    <div className="rounded-md border">
      {facilities.map((facility, index) => (
        <div
          key={facility.id}
          className={`${index !== facilities.length - 1 || isAdding || showAddButton ? "border-b" : ""}`}
        >
          {editingId === facility.id ? (
            renderInlineForm(false, facility)
          ) : (
            <div className="flex items-center justify-between px-3 py-2">
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
                  onClick={() => handleStartEdit(facility)}
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
          )}
        </div>
      ))}
      {isAdding && renderInlineForm(true)}
      {showAddButton && (
        <div className="px-3 py-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs w-full justify-start text-muted-foreground hover:text-foreground"
            onClick={onStartAdd}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add facility
          </Button>
        </div>
      )}
    </div>
  );
};
