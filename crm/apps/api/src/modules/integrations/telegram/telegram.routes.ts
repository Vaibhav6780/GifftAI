import { Router } from "express";
import { telegramWebhookController } from "./telegram.webhook.controller";
import { webhookLimiter } from "../../../middleware/rateLimit.middleware";

/** Public, unauthenticated — mounted under /public/webhooks/telegram in public.routes.ts.
 *  Verifies Telegram's X-Telegram-Bot-Api-Secret-Token header in the controller itself. */
export const telegramWebhookRouter = Router();

telegramWebhookRouter.post("/", webhookLimiter, telegramWebhookController.receive);
