import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getRoleDisplayName, isMaster, canModifyRole } from "@/lib/roles";
import { Badge } from "@/components/ui/badge";

interface RoleSelectProps {
  currentRole: string | null;
  currentUserRole: string;
  targetUserId: string;
  currentUserId: string;
  onRoleChange: (userId: string, newRole: string) => void;
  disabled?: boolean;
}

export function RoleSelect({
  currentRole,
  currentUserRole,
  targetUserId,
  currentUserId,
  onRoleChange,
  disabled = false,
}: RoleSelectProps) {
  // CSV users without auth accounts can't have roles yet - show pending registration
  if (!currentRole) {
    return (
      <Badge variant="secondary" className="text-xs">
        Awaiting Registration
      </Badge>
    );
  }

  // Can't change role if:
  // 1. Target is master (can't demote master)
  // 2. Current user can't modify the target's role
  // 3. Trying to edit own role
  const isTargetMaster = isMaster(currentRole);
  const canModify = canModifyRole(currentUserRole, currentRole);
  const isSelf = targetUserId === currentUserId;
  
  const isDisabled = disabled || isTargetMaster || !canModify || isSelf;

  // If master, show a non-editable badge
  if (isTargetMaster) {
    return (
      <Badge variant="default" className="bg-primary/10 text-primary border-primary/20">
        Master
      </Badge>
    );
  }

  // Available roles - admin and master can assign admin, manager, staff
  const availableRoles = ['admin', 'manager', 'staff'];

  return (
    <Select
      value={currentRole}
      onValueChange={(value) => onRoleChange(targetUserId, value)}
      disabled={isDisabled}
    >
      <SelectTrigger className="w-[120px] h-8">
        <SelectValue>{getRoleDisplayName(currentRole)}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {availableRoles.map((role) => (
          <SelectItem key={role} value={role}>
            {getRoleDisplayName(role)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
