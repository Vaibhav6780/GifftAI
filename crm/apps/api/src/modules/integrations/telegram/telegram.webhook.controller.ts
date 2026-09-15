import type { Request, Response } from "express";
import { asyncHandler } from "../../../lib/asyncHandler";
import { telegramAdminService } from "./telegram.admin.service";
import { telegramInboundQueue } from "../../../jobs/queues/telegramInbound.queue";
import type { TelegramUpdate } from "./telegram.service";

export const telegramWebhookController = {
  receive: asyncHandler(async (req: Request, res: Response) => {
    const expectedSecret = await telegramAdminService.getWebhookSecret();
    const providedSecret = req.header("x-telegram-bot-api-secret-token");

    if (!expectedSecret || providedSecret !== expectedSecret) {
      res.status(401).end();
      return;
    }

    await telegramInboundQueue.add("update", { update: req.body as TelegramUpdate });

    // Telegram requires a fast 200 regardless of processing outcome, or it retries
    // aggressively and eventually disables the webhook — actual ingestion happens async.
    res.status(200).end();
  }),
};
