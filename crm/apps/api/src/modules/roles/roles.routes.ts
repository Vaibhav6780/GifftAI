import { Router } from "express";
import { createRoleSchema, setRolePermissionsSchema, updateRoleSchema } from "@gifftai/shared";
import { rolesController } from "./roles.controller";
import { validate } from "../../middleware/validate.middleware";
import { requireAuth } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/rbac.middleware";

export const rolesRouter = Router();

rolesRouter.use(requireAuth);

rolesRouter.get("/", requirePermission("roles:read"), rolesController.list);
rolesRouter.get("/:id", requirePermission("roles:read"), rolesController.getById);
rolesRouter.post("/", requirePermission("roles:create"), validate(createRoleSchema), rolesController.create);
rolesRouter.patch(
  "/:id",
  requirePermission("roles:update"),
  validate(updateRoleSchema),
  rolesController.update,
);
rolesRouter.put(
  "/:id/permissions",
  requirePermission("roles:update"),
  validate(setRolePermissionsSchema),
  rolesController.setPermissions,
);
rolesRouter.delete("/:id", requirePermission("roles:delete"), rolesController.remove);
