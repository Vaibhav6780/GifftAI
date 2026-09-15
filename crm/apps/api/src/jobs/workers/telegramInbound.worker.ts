import { Worker } from "bullmq";
import { bullmqConnection } from "../../config/redis";
import { logger } from "../../config/logger";
import { TELEGRAM_INBOUND_QUEUE_NAME } from "../queues/telegramInbound.queue";
import { telegramInboundProcessor } from "../processors/telegramInbound.processor";

export function startTelegramInboundWorker(): Worker {
  const worker = new Worker(TELEGRAM_INBOUND_QUEUE_NAME, telegramInboundProcessor, {
    connection: bullmqConnection,
    concurrency: 5,
  });
  worker.on("completed", (job) => logger.info({ jobId: job.id }, "Telegram inbound job completed"));
  worker.on("failed", (job, err) => logger.error({ jobId: job?.id, err }, "Telegram inbound job failed"));
  return worker;
}
