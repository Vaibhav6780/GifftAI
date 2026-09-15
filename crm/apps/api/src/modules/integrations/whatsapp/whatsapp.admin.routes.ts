import { Router } from "express";
import { whatsappConnectSchema, whatsappInboxQuerySchema, whatsappReplySchema } from "@gifftai/shared";
import { whatsappAdminController } from "./whatsapp.admin.controller";
import { validate } from "../../../middleware/validate.middleware";
import { requirePermission } from "../../../middleware/rbac.middleware";

/** Mounted under /api/integrations/whatsapp in integrations-admin.routes.ts (already
 *  behind requireAuth there). */
export const whatsappAdminRouter = Router();

whatsappAdminRouter.post(
  "/connect",
  requirePermission("settings:manage_integrations"),
  validate(whatsappConnectSchema),
  whatsappAdminController.connect,
);

/** Verifies API key/secret against GET /account without persisting anything. */
whatsappAdminRouter.post(
  "/test",
  requirePermission("settings:manage_integrations"),
  validate(whatsappConnectSchema),
  whatsappAdminController.testConnection,
);

whatsappAdminRouter.post(
  "/sync-contacts",
  requirePermission("settings:manage_integrations"),
  whatsappAdminController.syncContacts,
);

/** Bulk "Import WhatsApp History" — same admin tier as Sync Contacts. Enqueues a background
 *  job (see jobs/queues/whatsappHistoryImport.queue.ts) rather than running inline, so it
 *  can't repeat the Sync Contacts incident where a long-held request outran the access
 *  token and forced a logout. */
whatsappAdminRouter.post(
  "/import-history",
  requirePermission("settings:manage_integrations"),
  whatsappAdminController.startHistoryImport,
);
whatsappAdminRouter.get(
  "/import-history/status",
  requirePermission("settings:manage_integrations"),
  whatsappAdminController.getHistoryImportStatus,
);

// Inbox list — day-to-day agent access, same tier as the per-lead actions below.
whatsappAdminRouter.get(
  "/inbox",
  requirePermission("leads:read"),
  validate(whatsappInboxQuerySchema, "query"),
  whatsappAdminController.listInbox,
);

// Per-lead actions — gated by leads:update (day-to-day sales action), not the
// settings:manage_integrations permission the routes above use.
whatsappAdminRouter.post(
  "/leads/:leadId/sync",
  requirePermission("leads:update"),
  whatsappAdminController.syncConversation,
);
whatsappAdminRouter.post(
  "/leads/:leadId/reply",
  requirePermission("leads:update"),
  validate(whatsappReplySchema),
  whatsappAdminController.reply,
);
