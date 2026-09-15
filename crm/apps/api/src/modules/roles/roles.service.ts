import type {
  CreateRoleInput,
  PermissionKey,
  RoleDetail,
  RoleSummary,
  SetRolePermissionsInput,
  UpdateRoleInput,
} from "@gifftai/shared";
import { rolesRepository, type RoleWithCounts, type RoleWithPermissions } from "./roles.repository";
import { AppError } from "../../lib/apiError";
import { writeAuditLog } from "../../lib/auditLog";
import type { RequestMeta } from "../../lib/requestMeta";

function toSummary(role: RoleWithCounts): RoleSummary {
  return {
    id: role.id,
    name: role.name,
    description: role.description,
    isSystem: role.isSystem,
    permissionCount: role._count.rolePermissions,
    userCount: role._count.userRoles,
    createdAt: role.createdAt.toISOString(),
    updatedAt: role.updatedAt.toISOString(),
  };
}

function toDetail(role: RoleWithPermissions): RoleDetail {
  return {
    ...toSummary(role),
    permissions: role.rolePermissions.map((rp) => rp.permission.key as PermissionKey),
  };
}

async function resolvePermissionIds(keys: PermissionKey[]): Promise<string[]> {
  if (keys.length === 0) return [];
  const records = await rolesRepository.findPermissionIdsByKeys(keys);
  return records.map((r) => r.id);
}

/**
 * Blocks an admin from editing their only role's permission set in a way that would
 * strip their own ability to manage roles — otherwise they'd be permanently locked out
 * with no other admin action available to undo it.
 */
function assertNotSelfLockout(
  actorRoles: string[],
  role: RoleWithPermissions,
  nextPermissionKeys: PermissionKey[],
): void {
  const isActorsOnlyRole = actorRoles.length === 1 && actorRoles[0] === role.name;
  if (isActorsOnlyRole && !nextPermissionKeys.includes("roles:update")) {
    throw AppError.forbidden("This would remove your own ability to manage roles");
  }
}

export const rolesService = {
  async list(): Promise<RoleSummary[]> {
    const roles = await rolesRepository.list();
    return roles.map(toSummary);
  },

  async getById(id: string): Promise<RoleDetail> {
    const role = await rolesRepository.findById(id);
    if (!role) throw AppError.notFound("Role not found");
    return toDetail(role);
  },

  async create(input: CreateRoleInput, actorId: string, meta: RequestMeta): Promise<RoleDetail> {
    const existing = await rolesRepository.findByName(input.name);
    if (existing) throw AppError.conflict("A role with this name already exists");

    const permissionIds = await resolvePermissionIds(input.permissionKeys);
    const role = await rolesRepository.create({
      name: input.name,
      description: input.description,
      permissionIds,
    });

    await writeAuditLog({
      userId: actorId,
      action: "role.create",
      entityType: "Role",
      entityId: role.id,
      newValue: { name: role.name, permissionKeys: input.permissionKeys },
      ...meta,
    });

    return toDetail(role);
  },

  async update(id: string, input: UpdateRoleInput, actorId: string, meta: RequestMeta): Promise<RoleDetail> {
    const existing = await rolesRepository.findById(id);
    if (!existing) throw AppError.notFound("Role not found");

    if (existing.isSystem && input.name !== undefined) {
      throw AppError.conflict("System role names cannot be changed");
    }

    if (input.name) {
      const nameClash = await rolesRepository.findByName(input.name);
      if (nameClash && nameClash.id !== id) {
        throw AppError.conflict("A role with this name already exists");
      }
    }

    const updated = await rolesRepository.updateNameDescription(id, input);
    await writeAuditLog({
      userId: actorId,
      action: "role.update",
      entityType: "Role",
      entityId: id,
      newValue: input,
      ...meta,
    });

    return toDetail(updated);
  },

  async setPermissions(
    id: string,
    input: SetRolePermissionsInput,
    actor: { id: string; roles: string[] },
    meta: RequestMeta,
  ): Promise<RoleDetail> {
    const existing = await rolesRepository.findById(id);
    if (!existing) throw AppError.notFound("Role not found");

    assertNotSelfLockout(actor.roles, existing, input.permissionKeys);

    const permissionIds = await resolvePermissionIds(input.permissionKeys);
    const updated = await rolesRepository.setPermissions(id, permissionIds);

    await writeAuditLog({
      userId: actor.id,
      action: "role.permissions_update",
      entityType: "Role",
      entityId: id,
      oldValue: { permissionKeys: existing.rolePermissions.map((rp) => rp.permission.key) },
      newValue: { permissionKeys: input.permissionKeys },
      ...meta,
    });

    return toDetail(updated);
  },

  async remove(id: string, actorId: string, meta: RequestMeta): Promise<void> {
    const existing = await rolesRepository.findById(id);
    if (!existing) throw AppError.notFound("Role not found");
    if (existing.isSystem) throw AppError.conflict("System roles cannot be deleted");
    if (existing._count.userRoles > 0) {
      throw AppError.conflict("This role is still assigned to users and cannot be deleted");
    }

    await rolesRepository.delete(id);
    await writeAuditLog({
      userId: actorId,
      action: "role.delete",
      entityType: "Role",
      entityId: id,
      oldValue: { name: existing.name },
      ...meta,
    });
  },
};
