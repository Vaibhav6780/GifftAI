import { Router } from "express";
import { assignTicketSchema, createTicketSchema, listTicketsQuerySchema, updateTicketSchema } from "@gifftai/shared";
import { ticketsController } from "./tickets.controller";
import { validate } from "../../middleware/validate.middleware";
import { requireAuth } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/rbac.middleware";
import { attachmentUploadArray } from "../../lib/attachmentUpload";

export const ticketsRouter = Router();

ticketsRouter.use(requireAuth);

ticketsRouter.get(
  "/",
  requirePermission("tickets:read"),
  validate(listTicketsQuerySchema, "query"),
  ticketsController.list,
);
ticketsRouter.get("/:id", requirePermission("tickets:read"), ticketsController.getById);
ticketsRouter.post("/", requirePermission("tickets:create"), validate(createTicketSchema), ticketsController.create);
ticketsRouter.patch(
  "/:id",
  requirePermission("tickets:update"),
  validate(updateTicketSchema),
  ticketsController.update,
);
ticketsRouter.patch(
  "/:id/assign",
  requirePermission("tickets:update"),
  validate(assignTicketSchema),
  ticketsController.assign,
);
ticketsRouter.delete("/:id", requirePermission("tickets:delete"), ticketsController.remove);

ticketsRouter.get("/:id/attachments", requirePermission("tickets:read"), ticketsController.listAttachments);
ticketsRouter.post(
  "/:id/attachments",
  requirePermission("tickets:update"),
  attachmentUploadArray("attachments"),
  ticketsController.addAttachment,
);
ticketsRouter.delete(
  "/:id/attachments/:attachmentId",
  requirePermission("tickets:update"),
  ticketsController.removeAttachment,
);
