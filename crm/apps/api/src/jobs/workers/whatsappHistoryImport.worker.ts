import { Worker } from "bullmq";
import { bullmqConnection } from "../../config/redis";
import { logger } from "../../config/logger";
import { WHATSAPP_HISTORY_IMPORT_QUEUE_NAME } from "../queues/whatsappHistoryImport.queue";
import { whatsappHistoryImportProcessor } from "../processors/whatsappHistoryImport.processor";

export function startWhatsappHistoryImportWorker(): Worker {
  const worker = new Worker(WHATSAPP_HISTORY_IMPORT_QUEUE_NAME, whatsappHistoryImportProcessor, {
    connection: bullmqConnection,
    concurrency: 1,
  });
  worker.on("completed", (job) => logger.info({ jobId: job.id }, "WhatsApp history import completed"));
  worker.on("failed", (job, err) => logger.error({ jobId: job?.id, err }, "WhatsApp history import failed"));
  return worker;
}
