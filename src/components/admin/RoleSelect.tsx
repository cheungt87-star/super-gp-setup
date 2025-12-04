import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getRoleDisplayName, isMaster, canModifyRole } from "@/lib/roles";

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
  // Can't change role if:
  // 1. User hasn't completed registration (no role)
  // 2. Target is master (can't demote master)
  // 3. Current user can't modify the target's role
  // 4. Trying to edit own role
  const isTargetMaster = isMaster(currentRole);
  const canModify = canModifyRole(currentUserRole, currentRole);
  const isSelf = targetUserId === currentUserId;
  
  const isDisabled = disabled || !currentRole || isTargetMaster || !canModify || isSelf;

  if (!currentRole) {
    return (
      <span className="text-muted-foreground text-sm">Pending</span>
    );
  }

  // Available roles based on current user's role
  const availableRoles = currentUserRole === 'master' 
    ? ['admin', 'manager', 'staff'] 
    : ['admin', 'manager', 'staff'];

  return (
    <Select
      value={currentRole}
      onValueChange={(value) => onRoleChange(targetUserId, value)}
      disabled={isDisabled}
    >
      <SelectTrigger className="w-[120px]">
        <SelectValue>{getRoleDisplayName(currentRole)}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {isTargetMaster ? (
          <SelectItem value="master">Master</SelectItem>
        ) : (
          availableRoles.map((role) => (
            <SelectItem key={role} value={role}>
              {getRoleDisplayName(role)}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
