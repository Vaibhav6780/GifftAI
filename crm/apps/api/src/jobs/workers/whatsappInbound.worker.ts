import { Worker } from "bullmq";
import { bullmqConnection } from "../../config/redis";
import { logger } from "../../config/logger";
import { WHATSAPP_INBOUND_QUEUE_NAME } from "../queues/whatsappInbound.queue";
import { whatsappInboundProcessor } from "../processors/whatsappInbound.processor";

export function startWhatsappInboundWorker(): Worker {
  const worker = new Worker(WHATSAPP_INBOUND_QUEUE_NAME, whatsappInboundProcessor, {
    connection: bullmqConnection,
    concurrency: 5,
  });
  worker.on("completed", (job) => logger.info({ jobId: job.id }, "WhatsApp inbound job completed"));
  worker.on("failed", (job, err) => logger.error({ jobId: job?.id, err }, "WhatsApp inbound job failed"));
  return worker;
}
