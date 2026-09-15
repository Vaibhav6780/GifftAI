import type { PermissionKey } from "@gifftai/shared";
import { ROLES } from "@gifftai/shared";
import { useAuthStore } from "../features/auth/authStore";

/** True if the current user holds at least one of the given permission keys. */
export function useHasPermission(...keys: PermissionKey[]): boolean {
  return useAuthStore((s) => {
    const permissions = s.user?.permissions ?? [];
    return keys.some((key) => permissions.includes(key));
  });
}

function isPrivileged(user: { roles: string[] } | null | undefined): boolean {
  return Boolean(user) && (user!.roles.includes(ROLES.ADMIN) || user!.roles.includes(ROLES.SUPER_ADMIN));
}

/** True if the current user holds Admin or Super Admin. */
export function useIsPrivileged(): boolean {
  return useAuthStore((s) => isPrivileged(s.user));
}

/** True if the current user is the given record's assigned user (task assignee / lead
 *  owner) or holds Admin/Super Admin — the ownership rule that gates task status changes,
 *  task progress-note comments, and lead notes regardless of broader CRUD permissions. */
export function useIsAssignedOrPrivileged(assignedUserId: string | null | undefined): boolean {
  return useAuthStore((s) => {
    const user = s.user;
    if (!user) return false;
    if (isPrivileged(user)) return true;
    return assignedUserId != null && assignedUserId === user.id;
  });
}
