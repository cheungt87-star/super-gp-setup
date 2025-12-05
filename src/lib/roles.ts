// Role hierarchy: master > admin > manager > staff
export const MANAGEMENT_ROLES = ['master', 'admin'] as const;
export const ALL_ROLES = ['master', 'admin', 'manager', 'staff'] as const;

export type AppRole = typeof ALL_ROLES[number];

/**
 * Check if a role has management capabilities (can manage org settings, users, etc.)
 */
export function canManageRoles(role: string | undefined | null): boolean {
  return role === 'master' || role === 'admin';
}

/**
 * Check if a role is the master role (highest privilege, cannot be demoted)
 */
export function isMaster(role: string | undefined | null): boolean {
  return role === 'master';
}

/**
 * Get the display name for a role
 */
export function getRoleDisplayName(role: string | undefined | null): string {
  switch (role) {
    case 'master': return 'Master';
    case 'admin': return 'Admin';
    case 'manager': return 'Manager';
    case 'staff': return 'General User';
    default: return 'Awaiting Registration';
  }
}

/**
 * Check if a user with sourceRole can modify a user with targetRole
 * Rules:
 * - Master can modify anyone except themselves
 * - Admin can modify admin, manager, staff but NOT master
 * - Manager and staff cannot modify roles
 */
export function canModifyRole(sourceRole: string | undefined | null, targetRole: string | undefined | null): boolean {
  if (!sourceRole || !targetRole) return false;
  
  // Only master and admin can modify roles
  if (!canManageRoles(sourceRole)) return false;
  
  // Admin cannot modify master
  if (sourceRole === 'admin' && targetRole === 'master') return false;
  
  return true;
}
