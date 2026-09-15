import { Worker } from "bullmq";
import { bullmqConnection } from "../../config/redis";
import { logger } from "../../config/logger";
import { HOSTINGER_MAIL_INBOUND_QUEUE_NAME } from "../queues/hostingerMailInbound.queue";
import { hostingerMailInboundProcessor } from "../processors/hostingerMailInbound.processor";

export function startHostingerMailInboundWorker(): Worker {
  const worker = new Worker(HOSTINGER_MAIL_INBOUND_QUEUE_NAME, hostingerMailInboundProcessor, {
    connection: bullmqConnection,
    // Concurrency 1 — every job does the same thing (resync from the shared uid cursor), so
    // running more than one at a time risks two jobs racing to read/advance the same cursor.
    concurrency: 1,
  });
  worker.on("completed", (job) => logger.info({ jobId: job.id }, "Hostinger Mail inbound job completed"));
  worker.on("failed", (job, err) => logger.error({ jobId: job?.id, err }, "Hostinger Mail inbound job failed"));
  return worker;
}
