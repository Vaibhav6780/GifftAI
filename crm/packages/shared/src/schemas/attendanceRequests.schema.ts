import { z } from "zod";

const cuid = z.string().cuid();
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

export const attendanceRequestTypeSchema = z.enum(["WORK_FROM_HOME", "LEAVE"]);
export type AttendanceRequestTypeInput = z.infer<typeof attendanceRequestTypeSchema>;

export const attendanceRequestStatusSchema = z.enum(["PENDING", "APPROVED", "REJECTED"]);
export type AttendanceRequestStatusInput = z.infer<typeof attendanceRequestStatusSchema>;

export const createAttendanceRequestSchema = z.object({
  type: attendanceRequestTypeSchema,
  reason: z.string().max(500).optional(),
});
export type CreateAttendanceRequestInput = z.infer<typeof createAttendanceRequestSchema>;

export const reviewAttendanceRequestSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  reviewNote: z.string().max(500).optional(),
});
export type ReviewAttendanceRequestInput = z.infer<typeof reviewAttendanceRequestSchema>;

export const listAttendanceRequestsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  userId: cuid.optional(),
  status: attendanceRequestStatusSchema.optional(),
  from: dateOnly.optional(),
  to: dateOnly.optional(),
});
export type ListAttendanceRequestsQuery = z.infer<typeof listAttendanceRequestsQuerySchema>;

export const listMyAttendanceRequestsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});
export type ListMyAttendanceRequestsQuery = z.infer<typeof listMyAttendanceRequestsQuerySchema>;

export const exportAttendanceRequestsQuerySchema = listAttendanceRequestsQuerySchema.omit({
  page: true,
  pageSize: true,
});
export type ExportAttendanceRequestsQuery = z.infer<typeof exportAttendanceRequestsQuerySchema>;
