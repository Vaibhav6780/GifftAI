import { z } from "zod";
import { PERMISSIONS, type PermissionKey } from "../constants/permissions.js";

// PERMISSIONS is a readonly `as const` tuple; z.enum needs a plain [string, ...string[]]
// literal-array shape, so the cast is required even though the values are identical.
export const permissionKeySchema = z.enum(
  PERMISSIONS as unknown as [PermissionKey, ...PermissionKey[]],
);

export const createRoleSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  description: z.string().max(500).optional(),
  permissionKeys: z.array(permissionKeySchema).default([]),
});
export type CreateRoleInput = z.infer<typeof createRoleSchema>;

export const updateRoleSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
});
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;

export const setRolePermissionsSchema = z.object({
  permissionKeys: z.array(permissionKeySchema),
});
export type SetRolePermissionsInput = z.infer<typeof setRolePermissionsSchema>;
