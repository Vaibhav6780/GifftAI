import { Router } from "express";
import { telegramConnectSchema, telegramInboxQuerySchema, telegramReplySchema } from "@gifftai/shared";
import { telegramAdminController } from "./telegram.admin.controller";
import { validate } from "../../../middleware/validate.middleware";
import { requirePermission } from "../../../middleware/rbac.middleware";

/** Mounted under /api/integrations/telegram in integrations-admin.routes.ts (already
 *  behind requireAuth there). */
export const telegramAdminRouter = Router();

telegramAdminRouter.post(
  "/connect",
  requirePermission("settings:manage_integrations"),
  validate(telegramConnectSchema),
  telegramAdminController.connect,
);

telegramAdminRouter.post("/set-webhook", requirePermission("settings:manage_integrations"), telegramAdminController.setWebhook);

// Inbox list — day-to-day agent access, same tier as the per-lead reply action below.
telegramAdminRouter.get(
  "/inbox",
  requirePermission("leads:read"),
  validate(telegramInboxQuerySchema, "query"),
  telegramAdminController.listInbox,
);

telegramAdminRouter.post(
  "/leads/:leadId/reply",
  requirePermission("leads:update"),
  validate(telegramReplySchema),
  telegramAdminController.reply,
);
