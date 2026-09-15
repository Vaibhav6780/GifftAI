import { Router } from "express";
import { instagramWebhookController } from "./instagram.webhook.controller";
import { instagramOAuth } from "./instagram.oauth";
import { webhookLimiter } from "../../../middleware/rateLimit.middleware";

/** Public, unauthenticated — webhook mounted under /public/webhooks/instagram, OAuth
 *  callback under /public/oauth/instagram/callback, both in public.routes.ts. */
export const instagramWebhookRouter = Router();
instagramWebhookRouter.get("/", instagramWebhookController.verify);
instagramWebhookRouter.post("/", webhookLimiter, instagramWebhookController.receive);

export const instagramOAuthCallbackRouter = Router();
instagramOAuthCallbackRouter.get("/", instagramOAuth.callback);
