import type { CreateDepartmentInput, DepartmentDetail, DepartmentNode, UpdateDepartmentInput } from "@gifftai/shared";
import { departmentsRepository, type DepartmentWithRelations } from "./departments.repository";
import { AppError } from "../../lib/apiError";
import { writeAuditLog } from "../../lib/auditLog";
import type { RequestMeta } from "../../lib/requestMeta";

function toNode(department: DepartmentWithRelations): DepartmentNode {
  return {
    id: department.id,
    name: department.name,
    parentId: department.parentId,
    managerId: department.managerId,
    managerName: department.manager
      ? `${department.manager.firstName} ${department.manager.lastName}`
      : null,
    userCount: department._count.users,
    childCount: department._count.children,
    createdAt: department.createdAt.toISOString(),
    updatedAt: department.updatedAt.toISOString(),
  };
}

function toDetail(department: DepartmentWithRelations): DepartmentDetail {
  return {
    ...toNode(department),
    children: department.children.map((c) => ({ id: c.id, name: c.name })),
  };
}

/**
 * A department can't become its own ancestor. Walks the proposed parent's chain
 * (bounded by the total department count) and rejects if it ever loops back to `id`.
 */
async function assertNoParentCycle(id: string, proposedParentId: string): Promise<void> {
  if (proposedParentId === id) {
    throw AppError.badRequest("A department cannot be its own parent");
  }

  const parentPairs = await departmentsRepository.listParentPairs();
  let current: string | null | undefined = proposedParentId;
  const seen = new Set<string>();

  while (current) {
    if (current === id) {
      throw AppError.badRequest("This would create a circular department hierarchy");
    }
    if (seen.has(current)) break;
    seen.add(current);
    current = parentPairs.get(current);
  }
}

export const departmentsService = {
  async list(): Promise<DepartmentNode[]> {
    const departments = await departmentsRepository.list();
    return departments.map(toNode);
  },

  async getById(id: string): Promise<DepartmentDetail> {
    const department = await departmentsRepository.findById(id);
    if (!department) throw AppError.notFound("Department not found");
    return toDetail(department);
  },

  async create(input: CreateDepartmentInput, actorId: string, meta: RequestMeta): Promise<DepartmentDetail> {
    if (input.parentId) {
      const parent = await departmentsRepository.findById(input.parentId);
      if (!parent) throw AppError.badRequest("Parent department does not exist");
    }

    const department = await departmentsRepository.create(input);
    await writeAuditLog({
      userId: actorId,
      action: "department.create",
      entityType: "Department",
      entityId: department.id,
      newValue: input,
      ...meta,
    });

    return toDetail(department);
  },

  async update(
    id: string,
    input: UpdateDepartmentInput,
    actorId: string,
    meta: RequestMeta,
  ): Promise<DepartmentDetail> {
    const existing = await departmentsRepository.findById(id);
    if (!existing) throw AppError.notFound("Department not found");

    if (input.parentId) {
      await assertNoParentCycle(id, input.parentId);
    }

    const updated = await departmentsRepository.update(id, input);
    await writeAuditLog({
      userId: actorId,
      action: "department.update",
      entityType: "Department",
      entityId: id,
      newValue: input,
      ...meta,
    });

    return toDetail(updated);
  },

  async remove(id: string, actorId: string, meta: RequestMeta): Promise<void> {
    const existing = await departmentsRepository.findById(id);
    if (!existing) throw AppError.notFound("Department not found");

    if (existing._count.children > 0 || existing._count.users > 0) {
      throw AppError.conflict(
        "This department still has child departments or assigned users and cannot be deleted",
      );
    }

    await departmentsRepository.delete(id);
    await writeAuditLog({
      userId: actorId,
      action: "department.delete",
      entityType: "Department",
      entityId: id,
      oldValue: { name: existing.name },
      ...meta,
    });
  },
};
