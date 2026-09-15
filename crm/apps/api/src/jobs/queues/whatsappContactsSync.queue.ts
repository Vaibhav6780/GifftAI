import { Queue } from "bullmq";
import { bullmqConnection } from "../../config/redis";

export const WHATSAPP_CONTACTS_SYNC_QUEUE_NAME = "whatsapp-contacts-sync";

export const whatsappContactsSyncQueue = new Queue(WHATSAPP_CONTACTS_SYNC_QUEUE_NAME, {
  connection: bullmqConnection,
  defaultJobOptions: { attempts: 2, removeOnComplete: 20, removeOnFail: 50 },
});

const REPEAT_JOB_ID = "whatsapp-contacts-sync-repeat";

/** Registers the repeatable schedule. Safe to call on every worker boot — BullMQ dedupes
 *  repeatable jobs by this fixed jobId instead of stacking up duplicates. */
export async function scheduleWhatsappContactsSync(): Promise<void> {
  await whatsappContactsSyncQueue.add("sync", {}, { repeat: { every: 60 * 60 * 1000 }, jobId: REPEAT_JOB_ID });
}
