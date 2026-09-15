import { Router } from "express";
import { hostingerMailWebhookController } from "./hostingerMail.webhook.controller";
import { webhookLimiter } from "../../../middleware/rateLimit.middleware";

/** Public, unauthenticated — mounted under /public/webhooks/hostinger-mail in
 *  public.routes.ts. Hostinger's own webhook creation is a plain POST /webhooks call we
 *  make ourselves (see hostingerMail.admin.service.ts#ensureWebhookRegistered), not a
 *  dashboard-driven challenge-response, so there's no GET verification handshake here. */
export const hostingerMailWebhookRouter = Router();

hostingerMailWebhookRouter.post("/", webhookLimiter, hostingerMailWebhookController.receive);
