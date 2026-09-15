import { logger } from "../../../config/logger";
import { telegramAdminService } from "./telegram.admin.service";
import { telegramService } from "./telegram.service";
import { telegramInboundQueue } from "../../../jobs/queues/telegramInbound.queue";

const POLL_TIMEOUT_SECONDS = 30;
const IDLE_RETRY_MS = 5000;
const ERROR_RETRY_MS = 3000;

/**
 * Local-dev fallback for Telegram delivery (env.TELEGRAM_MODE === "polling") — needs no
 * public HTTPS URL, unlike the webhook path. A held getUpdates() long-poll is a persistent
 * connection, not a discrete unit of work, so this runs as a self-restarting loop in the
 * worker process rather than a BullMQ job; each fetched update is enqueued onto the same
 * telegram-inbound queue the webhook uses, so processor logic stays single-sourced.
 */
export function startTelegramPollingLoop(): { stop: () => Promise<void> } {
  let stopped = false;
  let offset = 0;

  async function loop(): Promise<void> {
    while (!stopped) {
      const botToken = await telegramAdminService.getBotToken().catch(() => null);
      if (!botToken) {
        await new Promise((resolve) => setTimeout(resolve, IDLE_RETRY_MS));
        continue;
      }

      try {
        const updates = await telegramService.getUpdates(botToken, offset, POLL_TIMEOUT_SECONDS);
        for (const update of updates) {
          offset = update.update_id + 1;
          await telegramInboundQueue.add("update", { update });
        }
      } catch (error) {
        logger.warn({ err: error }, "Telegram long-poll iteration failed, retrying shortly");
        await new Promise((resolve) => setTimeout(resolve, ERROR_RETRY_MS));
      }
    }
  }

  const donePromise = loop();

  return {
    async stop() {
      stopped = true;
      await donePromise;
    },
  };
}
