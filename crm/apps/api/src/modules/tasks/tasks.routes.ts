import { Router } from "express";
import {
  bulkCreateTasksSchema,
  createTaskCommentSchema,
  createTaskSchema,
  listTasksQuerySchema,
  updateTaskSchema,
} from "@gifftai/shared";
import { tasksController } from "./tasks.controller";
import { validate } from "../../middleware/validate.middleware";
import { requireAuth } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/rbac.middleware";

export const tasksRouter = Router();

tasksRouter.use(requireAuth);

tasksRouter.get(
  "/",
  requirePermission("tasks:read"),
  validate(listTasksQuerySchema, "query"),
  tasksController.list,
);
tasksRouter.get("/:id", requirePermission("tasks:read"), tasksController.getById);
tasksRouter.get("/:id/activity", requirePermission("tasks:read"), tasksController.getActivity);
tasksRouter.post("/", requirePermission("tasks:create"), validate(createTaskSchema), tasksController.create);
tasksRouter.post(
  "/bulk-assign",
  requirePermission("tasks:create"),
  validate(bulkCreateTasksSchema),
  tasksController.bulkAssign,
);
tasksRouter.patch(
  "/:id",
  requirePermission("tasks:update"),
  validate(updateTaskSchema),
  tasksController.update,
);
tasksRouter.post(
  "/:id/comments",
  requirePermission("tasks:update"),
  validate(createTaskCommentSchema),
  tasksController.addComment,
);
tasksRouter.delete("/:id", requirePermission("tasks:delete"), tasksController.remove);
