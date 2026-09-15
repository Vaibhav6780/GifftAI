import { ROLES } from "@gifftai/shared";
import type { RequestUser } from "../types/express";

/** Admin/Super Admin bypass ownership checks (e.g. task-status changes, lead-note edits)
 *  that otherwise only the assigned user may perform. */
export function isPrivilegedRole(user: Pick<RequestUser, "roles">): boolean {
  return user.roles.includes(ROLES.ADMIN) || user.roles.includes(ROLES.SUPER_ADMIN);
}
