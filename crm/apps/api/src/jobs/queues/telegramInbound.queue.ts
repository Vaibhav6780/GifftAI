import { Queue } from "bullmq";
import { bullmqConnection } from "../../config/redis";
import type { TelegramUpdate } from "../../modules/integrations/telegram/telegram.service";

export interface TelegramInboundJobData {
  update: TelegramUpdate;
}

export const TELEGRAM_INBOUND_QUEUE_NAME = "telegram-inbound";

export const telegramInboundQueue = new Queue<TelegramInboundJobData>(TELEGRAM_INBOUND_QUEUE_NAME, {
  connection: bullmqConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});
