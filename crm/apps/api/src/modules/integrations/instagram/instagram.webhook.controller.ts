import type { Request, Response } from "express";
import { asyncHandler } from "../../../lib/asyncHandler";
import { handleMetaVerificationChallenge, verifyMetaSignature } from "../meta/meta.webhook";
import { instagramInboundQueue } from "../../../jobs/queues/instagramInbound.queue";
import type { InstagramMessagingEvent } from "./instagram.service";

interface InstagramWebhookBody {
  object?: string;
  entry?: { id: string; time: number; messaging?: InstagramMessagingEvent[] }[];
}

export const instagramWebhookController = {
  verify: (req: Request, res: Response) => handleMetaVerificationChallenge(req, res),

  receive: asyncHandler(async (req: Request, res: Response) => {
    if (!verifyMetaSignature(req)) {
      res.status(401).end();
      return;
    }

    const body = req.body as InstagramWebhookBody;
    for (const entry of body.entry ?? []) {
      for (const event of entry.messaging ?? []) {
        await instagramInboundQueue.add("event", { event });
      }
    }

    res.status(200).end();
  }),
};
