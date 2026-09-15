import { z } from "zod";

const cuid = z.string().cuid();
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

export const submitDailyReportSchema = z.object({
  summary: z.string().min(1, "Summary is required").max(5000),
});
export type SubmitDailyReportInput = z.infer<typeof submitDailyReportSchema>;

export const listDailyReportsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  userId: cuid.optional(),
  from: dateOnly.optional(),
  to: dateOnly.optional(),
});
export type ListDailyReportsQuery = z.infer<typeof listDailyReportsQuerySchema>;

export const listMyDailyReportsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});
export type ListMyDailyReportsQuery = z.infer<typeof listMyDailyReportsQuerySchema>;
