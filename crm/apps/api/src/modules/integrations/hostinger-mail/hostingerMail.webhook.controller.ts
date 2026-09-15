import type { Request, Response } from "express";
import crypto from "node:crypto";
import { asyncHandler } from "../../../lib/asyncHandler";
import { logger } from "../../../config/logger";
import { hostingerMailAdminService } from "./hostingerMail.admin.service";
import { hostingerMailInboundQueue } from "../../../jobs/queues/hostingerMailInbound.queue";

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export const hostingerMailWebhookController = {
  /** Hostinger sends the webhook's one-time `secret` as `Authorization: Bearer <secret>` on
   *  every delivery (documented in the OpenAPI spec's WebhookWithSecret schema) — that IS
   *  the signature check here, not an HMAC scheme.
   *
   *  The `message.received` delivery payload's JSON shape is not published anywhere in
   *  Hostinger's docs or OpenAPI spec (only that it "includes message metadata"), so rather
   *  than guess field names, this handler treats the POST purely as a wake-up signal: it
   *  ignores the body and enqueues a resync job that fetches whatever is new since the
   *  last processed uid via the documented List Messages endpoint. This is also
   *  self-healing against a missed/failed delivery, since every run resumes from the
   *  stored cursor rather than from this event's payload. */
  receive: asyncHandler(async (req: Request, res: Response) => {
    const config = await hostingerMailAdminService.getConfig();
    const providedSecret = req.header("authorization")?.replace(/^Bearer\s+/i, "");

    if (config?.webhookSecret) {
      if (!providedSecret || !timingSafeEqual(providedSecret, config.webhookSecret)) {
        logger.warn("Hostinger Mail webhook request had a missing/invalid Authorization bearer secret — rejecting");
        res.status(401).end();
        return;
      }
    } else {
      logger.warn("Hostinger Mail webhook received with no secret on file to verify against — accepting anyway");
    }

    await hostingerMailInboundQueue.add("message.received", {});
    res.status(200).end();
  }),
};
