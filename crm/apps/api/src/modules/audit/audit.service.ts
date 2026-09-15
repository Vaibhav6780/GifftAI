import type { AuditLogEntry, ListAuditLogQuery, PaginatedResult } from "@gifftai/shared";
import { auditRepository, type AuditLogWithUser } from "./audit.repository";

function toEntry(log: AuditLogWithUser): AuditLogEntry {
  return {
    id: log.id,
    userId: log.userId,
    userName: log.user ? `${log.user.firstName} ${log.user.lastName}` : null,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    oldValue: log.oldValue,
    newValue: log.newValue,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    createdAt: log.createdAt.toISOString(),
  };
}

export const auditService = {
  async list(query: ListAuditLogQuery): Promise<PaginatedResult<AuditLogEntry>> {
    const { items, total } = await auditRepository.list(query);
    return {
      items: items.map(toEntry),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    };
  },

  entityTypes(): Promise<string[]> {
    return auditRepository.distinctEntityTypes();
  },
};
