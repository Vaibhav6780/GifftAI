import { Router } from "express";
import { whatsappWebhookController } from "./whatsapp.webhook.controller";
import { webhookLimiter } from "../../../middleware/rateLimit.middleware";

/** Public, unauthenticated — mounted under /public/webhooks/whatsapp in public.routes.ts.
 *  No GET verification handshake here (that was Meta's convention) — WaHamster's webhook
 *  registration is a plain POST /webhooks call we make ourselves, not a dashboard-driven
 *  challenge-response. */
export const whatsappWebhookRouter = Router();

whatsappWebhookRouter.post("/", webhookLimiter, whatsappWebhookController.receive);
