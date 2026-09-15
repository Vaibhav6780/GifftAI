import { z } from "zod";

const cuid = z.string().cuid();

export const kycStatusSchema = z.enum(["PENDING", "VERIFIED", "REJECTED"]);
export type KycStatusInput = z.infer<typeof kycStatusSchema>;

export const createContactSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Enter a valid email address").optional(),
  phone: z.string().max(30).optional(),
  jobTitle: z.string().max(150).optional(),
  kycStatus: kycStatusSchema.optional(),
  companyId: cuid.nullable().optional(),
  ownerId: cuid.nullable().optional(),
});
export type CreateContactInput = z.infer<typeof createContactSchema>;

export const updateContactSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email("Enter a valid email address").nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
  jobTitle: z.string().max(150).nullable().optional(),
  kycStatus: kycStatusSchema.optional(),
  companyId: cuid.nullable().optional(),
  ownerId: cuid.nullable().optional(),
});
export type UpdateContactInput = z.infer<typeof updateContactSchema>;

export const listContactsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().max(200).optional(),
  companyId: cuid.optional(),
  ownerId: cuid.optional(),
  kycStatus: kycStatusSchema.optional(),
  sortBy: z.enum(["firstName", "lastName", "createdAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
export type ListContactsQuery = z.infer<typeof listContactsQuerySchema>;
