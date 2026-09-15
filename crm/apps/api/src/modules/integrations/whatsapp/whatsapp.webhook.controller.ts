import type { Request, Response } from "express";
import { asyncHandler } from "../../../lib/asyncHandler";
import { logger } from "../../../config/logger";
import { prisma } from "../../../config/prisma";
import { whatsappInboundQueue, type WhatsappWebhookEvent } from "../../../jobs/queues/whatsappInbound.queue";

async function getWebhookSecret(): Promise<string | null> {
  const connection = await prisma.integrationConnection.findUnique({ where: { channelType: "WHATSAPP" } });
  const config = connection?.config as { webhookSecret?: string } | null;
  return config?.webhookSecret ?? null;
}

function extractEvent(body: unknown): WhatsappWebhookEvent | null {
  const record = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : null;
  const raw = record?.event ?? record?.type;
  return raw === "message.received" || raw === "message.status" ? raw : null;
}

export const whatsappWebhookController = {
  receive: asyncHandler(async (req: Request, res: Response) => {
    // WaHamster's exact webhook payload shape (and whether/how it signs deliveries) isn't
    // documented anywhere — log every delivery unconditionally so the real shape can be
    // read off here and whatsapp.mapper.ts corrected once live traffic arrives.
    logger.info({ headers: req.headers, body: req.body }, "WhatsApp (WaHamster) webhook received");

    const expectedSecret = await getWebhookSecret();
    const providedSecret =
      req.header("x-webhook-secret") ?? req.header("x-wahamster-secret") ?? req.header("x-hub-signature-256");

    if (expectedSecret && providedSecret !== expectedSecret) {
      // Best-effort only: we don't know WaHamster's real header name/signing scheme yet, so
      // failing to match isn't treated as proof of forgery — just logged for now. Tighten
      // this to a hard 401 once the real mechanism is confirmed from the logs above.
      logger.warn("WhatsApp webhook secret header missing or did not match — accepting anyway pending signature-scheme confirmation");
    }

    const event = extractEvent(req.body);
    if (event) {
      await whatsappInboundQueue.add(event, { event, payload: req.body });
    } else {
      logger.warn({ body: req.body }, "WhatsApp webhook payload had no recognizable event/type field");
    }

    // Ack fast regardless of processing outcome — actual ingestion happens async via the queue.
    res.status(200).end();
  }),
};
