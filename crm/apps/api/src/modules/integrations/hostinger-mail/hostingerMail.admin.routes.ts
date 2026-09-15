import { Router } from "express";
import { mailComposeSchema, mailConnectSchema, mailInboxQuerySchema, mailReplySchema, mailSentQuerySchema } from "@gifftai/shared";
import { hostingerMailAdminController } from "./hostingerMail.admin.controller";
import { validate } from "../../../middleware/validate.middleware";
import { requirePermission } from "../../../middleware/rbac.middleware";

/** Mounted under /api/integrations/hostinger-mail in integrations-admin.routes.ts (already
 *  behind requireAuth there). */
export const hostingerMailAdminRouter = Router();

hostingerMailAdminRouter.post(
  "/connect",
  requirePermission("settings:manage_integrations"),
  validate(mailConnectSchema),
  hostingerMailAdminController.connect,
);

/** Verifies the API token + SMTP password without persisting anything. */
hostingerMailAdminRouter.post(
  "/test",
  requirePermission("settings:manage_integrations"),
  validate(mailConnectSchema),
  hostingerMailAdminController.testConnection,
);

hostingerMailAdminRouter.get("/inbox", requirePermission("mail:read"), validate(mailInboxQuerySchema, "query"), hostingerMailAdminController.listInbox);
hostingerMailAdminRouter.get("/sent", requirePermission("mail:read"), validate(mailSentQuerySchema, "query"), hostingerMailAdminController.listSent);

hostingerMailAdminRouter.get("/conversations/:conversationId/messages", requirePermission("mail:read"), hostingerMailAdminController.listConversationMessages);
hostingerMailAdminRouter.post("/conversations/:conversationId/mark-read", requirePermission("mail:read"), hostingerMailAdminController.markRead);
hostingerMailAdminRouter.post(
  "/conversations/:conversationId/reply",
  requirePermission("mail:send"),
  validate(mailReplySchema),
  hostingerMailAdminController.reply,
);

hostingerMailAdminRouter.post("/compose", requirePermission("mail:send"), validate(mailComposeSchema), hostingerMailAdminController.compose);
