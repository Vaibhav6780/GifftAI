import { Router } from "express";
import { leadSourcesController } from "./lead-sources.controller";
import { requireAuth } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/rbac.middleware";

export const leadSourcesRouter = Router();

leadSourcesRouter.use(requireAuth);

leadSourcesRouter.get("/", requirePermission("leads:read"), leadSourcesController.list);
