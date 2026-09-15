import { Queue } from "bullmq";
import { bullmqConnection } from "../../config/redis";

export const INTEGRATION_TOKEN_REFRESH_QUEUE_NAME = "integration-token-refresh";

export const integrationTokenRefreshQueue = new Queue(INTEGRATION_TOKEN_REFRESH_QUEUE_NAME, {
  connection: bullmqConnection,
  defaultJobOptions: { attempts: 2, removeOnComplete: 20, removeOnFail: 50 },
});

const REPEAT_JOB_ID = "integration-token-refresh-repeat";

/** Registers the repeatable schedule. Safe to call on every worker boot — BullMQ dedupes
 *  repeatable jobs by this fixed jobId instead of stacking up duplicates. */
export async function scheduleIntegrationTokenRefresh(): Promise<void> {
  await integrationTokenRefreshQueue.add("check", {}, { repeat: { every: 6 * 60 * 60 * 1000 }, jobId: REPEAT_JOB_ID });
}
