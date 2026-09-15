import { z } from "zod";
import { passwordSchema } from "./auth.schema.js";

export const userStatusSchema = z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]);
export type UserStatusInput = z.infer<typeof userStatusSchema>;

const cuid = z.string().cuid();

// A <select> whose "No department" placeholder option has value="" submits the
// empty string via react-hook-form, not undefined/null — plain cuid.optional()
// (or .nullable().optional()) only skips actual undefined/null, so "" still
// hit .cuid() and failed with "Invalid cuid". Normalize "" to the right empty
// value for each shape before validating.
const optionalCuid = z.preprocess((v) => (v === "" ? undefined : v), cuid.optional());
const nullableCuid = z.preprocess((v) => (v === "" ? null : v), cuid.nullable().optional());

export const createUserSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  phone: z.string().max(30).optional(),
  jobTitle: z.string().max(150).optional(),
  departmentId: optionalCuid,
  roleIds: z.array(cuid).min(1, "At least one role is required"),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().max(30).nullable().optional(),
  jobTitle: z.string().max(150).nullable().optional(),
  departmentId: nullableCuid,
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const updateUserStatusSchema = z.object({
  status: userStatusSchema,
});
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;

export const setUserRolesSchema = z.object({
  roleIds: z.array(cuid).min(1, "At least one role is required"),
});
export type SetUserRolesInput = z.infer<typeof setUserRolesSchema>;

export const setUserPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm the password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type SetUserPasswordInput = z.infer<typeof setUserPasswordSchema>;

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().max(200).optional(),
  status: userStatusSchema.optional(),
  departmentId: cuid.optional(),
  roleId: cuid.optional(),
  sortBy: z.enum(["firstName", "lastName", "email", "createdAt", "lastLoginAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
