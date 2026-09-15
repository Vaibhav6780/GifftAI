import { Router } from "express";
import { permissionsController } from "./permissions.controller";
import { requireAuth } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/rbac.middleware";

export const permissionsRouter = Router();

permissionsRouter.use(requireAuth);

permissionsRouter.get("/", requirePermission("roles:read"), permissionsController.list);
