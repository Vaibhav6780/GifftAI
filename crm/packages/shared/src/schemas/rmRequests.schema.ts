import { z } from "zod";

/** RM Requests proxies gifftai_official_web's admin API — ids below are that system's
 *  UUIDs, not this repo's cuids. */
const websiteUuid = z.string().uuid();

export const rmFundingRequestStatusSchema = z.enum(["pending", "approved", "credited", "rejected"]);
export type RmFundingRequestStatus = z.infer<typeof rmFundingRequestStatusSchema>;

export const rmManualRequestStatusSchema = z.enum(["new", "contacted", "done", "cancelled"]);
export type RmManualRequestStatus = z.infer<typeof rmManualRequestStatusSchema>;

export const listRmFundingRequestsQuerySchema = z.object({
  status: z.enum(["pending", "approved", "credited", "rejected", "all"]).optional(),
});
export type ListRmFundingRequestsQuery = z.infer<typeof listRmFundingRequestsQuerySchema>;

export const listRmManualRequestsQuerySchema = z.object({
  status: z.enum(["new", "contacted", "done", "cancelled", "all"]).optional(),
});
export type ListRmManualRequestsQuery = z.infer<typeof listRmManualRequestsQuerySchema>;

export const rejectRmFundingRequestSchema = z.object({
  reason: z.string().min(1, "A reason is required to reject").max(2000),
});
export type RejectRmFundingRequestInput = z.infer<typeof rejectRmFundingRequestSchema>;

export const setRmManualRequestStatusSchema = z.object({
  status: rmManualRequestStatusSchema,
});
export type SetRmManualRequestStatusInput = z.infer<typeof setRmManualRequestStatusSchema>;

export const assignRmUserSchema = z.object({
  rmId: websiteUuid.nullable(),
});
export type AssignRmUserInput = z.infer<typeof assignRmUserSchema>;
