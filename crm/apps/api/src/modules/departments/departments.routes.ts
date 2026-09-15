import { Router } from "express";
import { createDepartmentSchema, updateDepartmentSchema } from "@gifftai/shared";
import { departmentsController } from "./departments.controller";
import { validate } from "../../middleware/validate.middleware";
import { requireAuth } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/rbac.middleware";

export const departmentsRouter = Router();

departmentsRouter.use(requireAuth);

departmentsRouter.get("/", requirePermission("departments:read"), departmentsController.list);
departmentsRouter.get("/:id", requirePermission("departments:read"), departmentsController.getById);
departmentsRouter.post(
  "/",
  requirePermission("departments:create"),
  validate(createDepartmentSchema),
  departmentsController.create,
);
departmentsRouter.patch(
  "/:id",
  requirePermission("departments:update"),
  validate(updateDepartmentSchema),
  departmentsController.update,
);
departmentsRouter.delete("/:id", requirePermission("departments:delete"), departmentsController.remove);
