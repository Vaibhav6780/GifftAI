import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";

const departmentWithRelations = {
  manager: { select: { id: true, firstName: true, lastName: true } },
  children: { select: { id: true, name: true } },
  _count: { select: { children: true, users: true } },
} satisfies Prisma.DepartmentInclude;

export type DepartmentWithRelations = Prisma.DepartmentGetPayload<{ include: typeof departmentWithRelations }>;

export const departmentsRepository = {
  list(): Promise<DepartmentWithRelations[]> {
    return prisma.department.findMany({ include: departmentWithRelations, orderBy: { name: "asc" } });
  },

  findById(id: string): Promise<DepartmentWithRelations | null> {
    return prisma.department.findUnique({ where: { id }, include: departmentWithRelations });
  },

  /** id -> parentId pairs for every department, used to walk ancestor chains in-memory. */
  async listParentPairs(): Promise<Map<string, string | null>> {
    const rows = await prisma.department.findMany({ select: { id: true, parentId: true } });
    return new Map(rows.map((r) => [r.id, r.parentId]));
  },

  create(data: { name: string; parentId?: string | null; managerId?: string | null }): Promise<DepartmentWithRelations> {
    return prisma.department.create({ data, include: departmentWithRelations });
  },

  update(
    id: string,
    data: { name?: string; parentId?: string | null; managerId?: string | null },
  ): Promise<DepartmentWithRelations> {
    return prisma.department.update({ where: { id }, data, include: departmentWithRelations });
  },

  delete(id: string) {
    return prisma.department.delete({ where: { id } });
  },
};
