import { Worker } from "bullmq";
import { bullmqConnection } from "../../config/redis";
import { logger } from "../../config/logger";
import { INTEGRATIONS_AUTO_SYNC_QUEUE_NAME } from "../queues/integrationsAutoSync.queue";
import { integrationsAutoSyncProcessor } from "../processors/integrationsAutoSync.processor";

export function startIntegrationsAutoSyncWorker(): Worker {
  const worker = new Worker(INTEGRATIONS_AUTO_SYNC_QUEUE_NAME, integrationsAutoSyncProcessor, {
    connection: bullmqConnection,
    concurrency: 1,
  });
  worker.on("completed", () => logger.info("Integrations auto-sync completed"));
  worker.on("failed", (job, err) => logger.error({ jobId: job?.id, err }, "Integrations auto-sync failed"));
  return worker;
}
