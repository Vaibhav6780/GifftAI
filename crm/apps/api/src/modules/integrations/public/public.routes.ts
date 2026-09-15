import { Router } from "express";
import { websiteRouter } from "../website/website.routes";
import { telegramWebhookRouter } from "../telegram/telegram.routes";
import { whatsappWebhookRouter } from "../whatsapp/whatsapp.routes";
import { instagramWebhookRouter, instagramOAuthCallbackRouter } from "../instagram/instagram.routes";
import { linkedinOAuthCallbackRouter } from "../linkedin/linkedin.routes";
import { hostingerMailWebhookRouter } from "../hostinger-mail/hostingerMail.routes";

/**
 * Aggregates every unauthenticated lead-ingestion endpoint (website contact form, platform
 * webhooks, OAuth callbacks). Mounted at /api/public in app.ts — deliberately never has
 * requireAuth applied, unlike every other router under /api. Each platform module attaches
 * its own sub-router here as it's built.
 */
export const publicIntegrationsRouter = Router();

publicIntegrationsRouter.use("/website", websiteRouter);
publicIntegrationsRouter.use("/webhooks/telegram", telegramWebhookRouter);
publicIntegrationsRouter.use("/webhooks/whatsapp", whatsappWebhookRouter);
publicIntegrationsRouter.use("/webhooks/instagram", instagramWebhookRouter);
publicIntegrationsRouter.use("/webhooks/hostinger-mail", hostingerMailWebhookRouter);
publicIntegrationsRouter.use("/oauth/instagram/callback", instagramOAuthCallbackRouter);
publicIntegrationsRouter.use("/oauth/linkedin/callback", linkedinOAuthCallbackRouter);
