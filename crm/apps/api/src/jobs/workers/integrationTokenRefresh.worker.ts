import { Worker } from "bullmq";
import { bullmqConnection } from "../../config/redis";
import { logger } from "../../config/logger";
import { INTEGRATION_TOKEN_REFRESH_QUEUE_NAME } from "../queues/integrationTokenRefresh.queue";
import { integrationTokenRefreshProcessor } from "../processors/integrationTokenRefresh.processor";

export function startIntegrationTokenRefreshWorker(): Worker {
  const worker = new Worker(INTEGRATION_TOKEN_REFRESH_QUEUE_NAME, integrationTokenRefreshProcessor, {
    connection: bullmqConnection,
    concurrency: 1,
  });
  worker.on("completed", () => logger.info("Integration token refresh check completed"));
  worker.on("failed", (job, err) => logger.error({ jobId: job?.id, err }, "Integration token refresh check failed"));
  return worker;
}
