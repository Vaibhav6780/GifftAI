import { Router } from "express";
import { listAuditLogQuerySchema } from "@gifftai/shared";
import { auditController } from "./audit.controller";
import { validate } from "../../middleware/validate.middleware";
import { requireAuth } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/rbac.middleware";

export const auditRouter = Router();

auditRouter.use(requireAuth);
auditRouter.use(requirePermission("audit:read"));

auditRouter.get("/entity-types", auditController.entityTypes);
auditRouter.get("/", validate(listAuditLogQuerySchema, "query"), auditController.list);
