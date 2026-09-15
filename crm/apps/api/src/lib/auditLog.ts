import type { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";

export function writeAuditLog(params: {
  userId?: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string;
  userAgent?: string;
}) {
  return prisma.auditLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      oldValue: params.oldValue as Prisma.InputJsonValue | undefined,
      newValue: params.newValue as Prisma.InputJsonValue | undefined,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    },
  });
}
