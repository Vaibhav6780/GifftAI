import { z } from "zod";

const cuid = z.string().cuid();
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

export const taskTypeSchema = z.enum(["TASK", "CALL", "MEETING", "FOLLOW_UP", "EMAIL"]);
export type TaskTypeInput = z.infer<typeof taskTypeSchema>;

export const taskPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);
export type TaskPriorityInput = z.infer<typeof taskPrioritySchema>;

export const taskStatusSchema = z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]);
export type TaskStatusInput = z.infer<typeof taskStatusSchema>;

export const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(2000).optional(),
  type: taskTypeSchema.optional(),
  priority: taskPrioritySchema.optional(),
  status: taskStatusSchema.optional(),
  dueAt: z.string().datetime().nullable().optional(),
  assignedToId: cuid.nullable().optional(),
});
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  type: taskTypeSchema.optional(),
  priority: taskPrioritySchema.optional(),
  status: taskStatusSchema.optional(),
  dueAt: z.string().datetime().nullable().optional(),
  assignedToId: cuid.nullable().optional(),
});
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

/** One row of a bulk-assign submission — everything from `createTaskSchema` except who it's
 *  assigned to (fixed once for the whole batch) and type/status (always TASK/PENDING here). */
export const bulkCreateTaskItemSchema = createTaskSchema.pick({
  title: true,
  description: true,
  priority: true,
  dueAt: true,
});
export type BulkCreateTaskItemInput = z.infer<typeof bulkCreateTaskItemSchema>;

export const bulkCreateTasksSchema = z.object({
  assignedToId: cuid,
  tasks: z.array(bulkCreateTaskItemSchema).min(1, "Add at least one task").max(50, "Maximum 50 tasks at once"),
});
export type BulkCreateTasksInput = z.infer<typeof bulkCreateTasksSchema>;

export const createTaskCommentSchema = z.object({
  body: z.string().min(1, "Comment cannot be empty").max(2000),
});
export type CreateTaskCommentInput = z.infer<typeof createTaskCommentSchema>;

export const listTasksQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().max(200).optional(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  type: taskTypeSchema.optional(),
  assignedToId: cuid.optional(),
  /** When true, overrides `status` to mean "PENDING or IN_PROGRESS with dueAt in the past". */
  overdue: z.coerce.boolean().optional(),
  /** Restricts to tasks created on this calendar day (UTC). */
  createdDate: dateOnly.optional(),
  sortBy: z.enum(["dueAt", "priority", "createdAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
