import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";

const roleWithCounts = {
  _count: { select: { rolePermissions: true, userRoles: true } },
} satisfies Prisma.RoleInclude;

const roleWithPermissions = {
  ...roleWithCounts,
  rolePermissions: { include: { permission: { select: { key: true } } } },
} satisfies Prisma.RoleInclude;

export type RoleWithCounts = Prisma.RoleGetPayload<{ include: typeof roleWithCounts }>;
export type RoleWithPermissions = Prisma.RoleGetPayload<{ include: typeof roleWithPermissions }>;

export const rolesRepository = {
  list(): Promise<RoleWithCounts[]> {
    return prisma.role.findMany({ include: roleWithCounts, orderBy: { name: "asc" } });
  },

  findById(id: string): Promise<RoleWithPermissions | null> {
    return prisma.role.findUnique({ where: { id }, include: roleWithPermissions });
  },

  findByName(name: string) {
    return prisma.role.findUnique({ where: { name } });
  },

  findPermissionIdsByKeys(keys: string[]) {
    return prisma.permission.findMany({ where: { key: { in: keys } }, select: { id: true, key: true } });
  },

  async create(params: {
    name: string;
    description?: string;
    permissionIds: string[];
  }): Promise<RoleWithPermissions> {
    return prisma.role.create({
      data: {
        name: params.name,
        description: params.description,
        isSystem: false,
        rolePermissions: { create: params.permissionIds.map((permissionId) => ({ permissionId })) },
      },
      include: roleWithPermissions,
    });
  },

  updateNameDescription(
    id: string,
    data: { name?: string; description?: string | null },
  ): Promise<RoleWithPermissions> {
    return prisma.role.update({ where: { id }, data, include: roleWithPermissions });
  },

  async setPermissions(id: string, permissionIds: string[]): Promise<RoleWithPermissions> {
    return prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId: id } });
      if (permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({ roleId: id, permissionId })),
        });
      }
      return tx.role.findUniqueOrThrow({ where: { id }, include: roleWithPermissions });
    });
  },

  delete(id: string) {
    return prisma.role.delete({ where: { id } });
  },
};
