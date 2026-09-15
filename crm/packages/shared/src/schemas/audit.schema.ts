import { z } from "zod";

const cuid = z.string().cuid();
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

export const listAuditLogQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  userId: cuid.optional(),
  entityType: z.string().min(1).optional(),
  entityId: z.string().min(1).optional(),
  action: z.string().min(1).optional(),
  from: dateOnly.optional(),
  to: dateOnly.optional(),
});
export type ListAuditLogQuery = z.infer<typeof listAuditLogQuerySchema>;
