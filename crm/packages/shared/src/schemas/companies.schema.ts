import { z } from "zod";

const cuid = z.string().cuid();

export const createCompanySchema = z.object({
  name: z.string().min(1, "Name is required").max(150),
  domain: z.string().max(150).optional(),
  industry: z.string().max(100).optional(),
  size: z.string().max(50).optional(),
  website: z.string().max(200).optional(),
  phone: z.string().max(30).optional(),
  description: z.string().max(2000).optional(),
  ownerId: cuid.nullable().optional(),
});
export type CreateCompanyInput = z.infer<typeof createCompanySchema>;

export const updateCompanySchema = z.object({
  name: z.string().min(1).max(150).optional(),
  domain: z.string().max(150).nullable().optional(),
  industry: z.string().max(100).nullable().optional(),
  size: z.string().max(50).nullable().optional(),
  website: z.string().max(200).nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  ownerId: cuid.nullable().optional(),
});
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;

export const listCompaniesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().max(200).optional(),
  industry: z.string().max(100).optional(),
  ownerId: cuid.optional(),
  sortBy: z.enum(["name", "industry", "createdAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
export type ListCompaniesQuery = z.infer<typeof listCompaniesQuerySchema>;
