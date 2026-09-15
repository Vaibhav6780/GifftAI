import { z } from "zod";

const cuid = z.string().cuid();
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

export const listAttendanceQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  userId: cuid.optional(),
  from: dateOnly.optional(),
  to: dateOnly.optional(),
});
export type ListAttendanceQuery = z.infer<typeof listAttendanceQuerySchema>;

export const exportAttendanceQuerySchema = listAttendanceQuerySchema.omit({ page: true, pageSize: true }).extend({
  hideSuperAdmin: z.coerce.boolean().optional(),
});
export type ExportAttendanceQuery = z.infer<typeof exportAttendanceQuerySchema>;
