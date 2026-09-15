import { Router } from "express";
import { dashboardController } from "./dashboard.controller";
import { requireAuth } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/rbac.middleware";

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

dashboardRouter.get("/summary", requirePermission("leads:read"), dashboardController.getSummary);
