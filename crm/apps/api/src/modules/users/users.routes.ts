import { Router } from "express";
import {
  createUserSchema,
  listUsersQuerySchema,
  setUserPasswordSchema,
  setUserRolesSchema,
  updateUserSchema,
  updateUserStatusSchema,
} from "@gifftai/shared";
import { usersController } from "./users.controller";
import { validate } from "../../middleware/validate.middleware";
import { requireAuth } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/rbac.middleware";

export const usersRouter = Router();

usersRouter.use(requireAuth);

usersRouter.get(
  "/",
  requirePermission("users:read"),
  validate(listUsersQuerySchema, "query"),
  usersController.list,
);
usersRouter.get("/:id", requirePermission("users:read"), usersController.getById);
usersRouter.post("/", requirePermission("users:create"), validate(createUserSchema), usersController.create);
usersRouter.patch(
  "/:id",
  requirePermission("users:update"),
  validate(updateUserSchema),
  usersController.update,
);
usersRouter.patch(
  "/:id/status",
  requirePermission("users:update"),
  validate(updateUserStatusSchema),
  usersController.updateStatus,
);
usersRouter.put(
  "/:id/roles",
  requirePermission("users:update"),
  validate(setUserRolesSchema),
  usersController.setRoles,
);
usersRouter.patch(
  "/:id/password",
  requirePermission("users:update"),
  validate(setUserPasswordSchema),
  usersController.setPassword,
);
usersRouter.delete("/:id", requirePermission("users:delete"), usersController.remove);
usersRouter.delete(
  "/:id/permanent",
  requirePermission("users:delete_permanent"),
  usersController.hardDelete,
);
usersRouter.post(
  "/:id/resend-welcome",
  requirePermission("users:update"),
  usersController.resendWelcome,
);
