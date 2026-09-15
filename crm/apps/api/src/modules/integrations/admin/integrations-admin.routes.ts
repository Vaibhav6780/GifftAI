import { Router } from "express";
import { z } from "zod";
import { integrationChannelTypeSchema } from "@gifftai/shared";
import { requireAuth } from "../../../middleware/auth.middleware";
import { requirePermission } from "../../../middleware/rbac.middleware";
import { validate } from "../../../middleware/validate.middleware";
import { integrationsAdminController } from "./integrations-admin.controller";
import { telegramAdminRouter } from "../telegram/telegram.admin.routes";
import { whatsappAdminRouter } from "../whatsapp/whatsapp.admin.routes";
import { instagramAdminRouter } from "../instagram/instagram.admin.routes";
import { linkedinAdminRouter } from "../linkedin/linkedin.admin.routes";
import { hostingerMailAdminRouter } from "../hostinger-mail/hostingerMail.admin.routes";

const channelTypeParamSchema = z.object({ channelType: integrationChannelTypeSchema });

/**
 * Aggregates every authenticated integration-management endpoint (generic list/detail/
 * disconnect/resync plus each platform's connect/oauth-start/admin actions). Mounted at
 * /api/integrations in app.ts. Every route here requires "settings:manage_integrations",
 * applied per-router by each platform module (kept per-route rather than blanket here so
 * platform routers stay self-contained and independently testable).
 */
export const integrationsAdminRouter = Router();

integrationsAdminRouter.use(requireAuth);

integrationsAdminRouter.use("/telegram", telegramAdminRouter);
integrationsAdminRouter.use("/whatsapp", whatsappAdminRouter);
integrationsAdminRouter.use("/instagram", instagramAdminRouter);
integrationsAdminRouter.use("/linkedin", linkedinAdminRouter);
integrationsAdminRouter.use("/hostinger-mail", hostingerMailAdminRouter);

// Generic endpoints, registered after the platform-specific mounts above so e.g.
// POST /telegram/connect is handled by telegramAdminRouter first; unmatched sub-paths
// (like a bare GET /telegram) fall through to the :channelType route below.
integrationsAdminRouter.get("/", requirePermission("settings:manage_integrations"), integrationsAdminController.list);
integrationsAdminRouter.get(
  "/:channelType",
  requirePermission("settings:manage_integrations"),
  validate(channelTypeParamSchema, "params"),
  integrationsAdminController.getByChannelType,
);
integrationsAdminRouter.post(
  "/:channelType/disconnect",
  requirePermission("settings:manage_integrations"),
  validate(channelTypeParamSchema, "params"),
  integrationsAdminController.disconnect,
);
integrationsAdminRouter.post(
  "/:channelType/resync",
  requirePermission("settings:manage_integrations"),
  validate(channelTypeParamSchema, "params"),
  integrationsAdminController.resync,
);
