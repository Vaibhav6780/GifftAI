import { Queue } from "bullmq";
import { bullmqConnection } from "../../config/redis";

export const WHATSAPP_HISTORY_IMPORT_QUEUE_NAME = "whatsapp-history-import";

/** Fixed id so a second "Import WhatsApp History" click while one is already queued/active
 *  doesn't pile up a duplicate job — BullMQ treats re-adding the same jobId as a no-op while
 *  a job with that id still exists in Redis, in ANY state including completed/failed, not
 *  just active. The admin service checks the persisted progress status before enqueueing to
 *  reject concurrent starts with a clear 400, but a terminal (completed/failed) leftover job
 *  must still be explicitly removed before re-adding — otherwise every retry after the first
 *  failure silently no-ops forever instead of actually re-running. See startHistoryImport(). */
export const WHATSAPP_HISTORY_IMPORT_JOB_ID = "whatsapp-history-import";

export const whatsappHistoryImportQueue = new Queue(WHATSAPP_HISTORY_IMPORT_QUEUE_NAME, {
  connection: bullmqConnection,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: 20,
    removeOnFail: 20,
  },
});
