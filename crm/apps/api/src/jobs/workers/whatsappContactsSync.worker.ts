import { Worker } from "bullmq";
import { bullmqConnection } from "../../config/redis";
import { logger } from "../../config/logger";
import { WHATSAPP_CONTACTS_SYNC_QUEUE_NAME } from "../queues/whatsappContactsSync.queue";
import { whatsappContactsSyncProcessor } from "../processors/whatsappContactsSync.processor";

export function startWhatsappContactsSyncWorker(): Worker {
  const worker = new Worker(WHATSAPP_CONTACTS_SYNC_QUEUE_NAME, whatsappContactsSyncProcessor, {
    connection: bullmqConnection,
    concurrency: 1,
  });
  worker.on("completed", () => logger.info("Hourly WhatsApp contacts sync check completed"));
  worker.on("failed", (job, err) => logger.error({ jobId: job?.id, err }, "Hourly WhatsApp contacts sync failed"));
  return worker;
}
