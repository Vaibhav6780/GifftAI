import { Worker } from "bullmq";
import { bullmqConnection } from "../../config/redis";
import { logger } from "../../config/logger";
import { INSTAGRAM_INBOUND_QUEUE_NAME } from "../queues/instagramInbound.queue";
import { instagramInboundProcessor } from "../processors/instagramInbound.processor";

export function startInstagramInboundWorker(): Worker {
  const worker = new Worker(INSTAGRAM_INBOUND_QUEUE_NAME, instagramInboundProcessor, {
    connection: bullmqConnection,
    concurrency: 5,
  });
  worker.on("completed", (job) => logger.info({ jobId: job.id }, "Instagram inbound job completed"));
  worker.on("failed", (job, err) => logger.error({ jobId: job?.id, err }, "Instagram inbound job failed"));
  return worker;
}
