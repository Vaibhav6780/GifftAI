import { z } from "zod";

const cuid = z.string().cuid();

// A <select> whose "None" placeholder option has value="" submits the empty
// string via react-hook-form, not null/undefined — plain cuid.nullable().
// optional() only skips actual null/undefined, so "" still hit .cuid() and
// failed with "Invalid cuid". Normalize "" to null before validating.
const nullableCuid = z.preprocess((v) => (v === "" ? null : v), cuid.nullable().optional());

export const createDepartmentSchema = z.object({
  name: z.string().min(1, "Name is required").max(150),
  parentId: nullableCuid,
  managerId: nullableCuid,
});
export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;

export const updateDepartmentSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  parentId: nullableCuid,
  managerId: nullableCuid,
});
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;
