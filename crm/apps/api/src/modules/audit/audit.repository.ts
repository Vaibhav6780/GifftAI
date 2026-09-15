import type { Prisma } from "@prisma/client";
import type { ListAuditLogQuery } from "@gifftai/shared";
import { prisma } from "../../config/prisma";

const logWithUser = {
  user: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.AuditLogInclude;

export type AuditLogWithUser = Prisma.AuditLogGetPayload<{ include: typeof logWithUser }>;

export const auditRepository = {
  async list(query: ListAuditLogQuery): Promise<{ items: AuditLogWithUser[]; total: number }> {
    const where: Prisma.AuditLogWhereInput = {
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
      ...(query.action ? { action: { contains: query.action, mode: "insensitive" } } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(`${query.from}T00:00:00.000Z`) } : {}),
              ...(query.to ? { lte: new Date(`${query.to}T23:59:59.999Z`) } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: logWithUser,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { items, total };
  },

  /** Distinct entityType values ever logged, for the filter dropdown — cheap since AuditLog
   *  already indexes (entityType, entityId) and this is a rare admin-only read. */
  distinctEntityTypes(): Promise<string[]> {
    return prisma.auditLog
      .findMany({ distinct: ["entityType"], select: { entityType: true }, orderBy: { entityType: "asc" } })
      .then((rows) => rows.map((r) => r.entityType));
  },
};
