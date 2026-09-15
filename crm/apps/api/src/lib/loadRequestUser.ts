import type { PermissionKey } from "@gifftai/shared";
import { prisma } from "../config/prisma";
import type { RequestUser } from "../types/express";

/**
 * Loads the user's roles/permissions fresh from the DB on every request rather than
 * embedding them in the JWT, so a role/permission change (or account suspension) takes
 * effect immediately instead of waiting for the access token to expire.
 */
export async function loadRequestUser(userId: string): Promise<RequestUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      userRoles: {
        include: { role: { include: { rolePermissions: { include: { permission: true } } } } },
      },
    },
  });

  if (!user || user.status !== "ACTIVE") return null;

  const roles = user.userRoles.map((ur) => ur.role.name);
  const permissions = Array.from(
    new Set(
      user.userRoles.flatMap((ur) => ur.role.rolePermissions.map((rp) => rp.permission.key as PermissionKey)),
    ),
  );

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: user.avatarUrl,
    roles,
    permissions,
  };
}
