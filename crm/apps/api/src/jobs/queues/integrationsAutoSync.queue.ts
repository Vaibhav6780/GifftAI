import { Queue } from "bullmq";
import { bullmqConnection } from "../../config/redis";

export const INTEGRATIONS_AUTO_SYNC_QUEUE_NAME = "integrations-auto-sync";

export const integrationsAutoSyncQueue = new Queue(INTEGRATIONS_AUTO_SYNC_QUEUE_NAME, {
  connection: bullmqConnection,
  defaultJobOptions: { attempts: 2, removeOnComplete: 20, removeOnFail: 50 },
});

const REPEAT_JOB_ID = "integrations-auto-sync-repeat";

/** Registers the repeatable schedule. Safe to call on every worker boot — BullMQ dedupes
 *  repeatable jobs by this fixed jobId instead of stacking up duplicates. */
export async function scheduleIntegrationsAutoSync(): Promise<void> {
  await integrationsAutoSyncQueue.add("sync", {}, { repeat: { every: 60 * 60 * 1000 }, jobId: REPEAT_JOB_ID });
}
