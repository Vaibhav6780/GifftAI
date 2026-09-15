import { Queue } from "bullmq";
import { bullmqConnection } from "../../config/redis";

export const ATTENDANCE_CUTOFF_QUEUE_NAME = "attendance-cutoff";

export const attendanceCutoffQueue = new Queue(ATTENDANCE_CUTOFF_QUEUE_NAME, {
  connection: bullmqConnection,
  defaultJobOptions: { attempts: 2, removeOnComplete: 20, removeOnFail: 50 },
});

const REPEAT_JOB_ID = "attendance-cutoff-repeat";

/** Registers the repeatable schedule. Safe to call on every worker boot — BullMQ dedupes
 *  repeatable jobs by this fixed jobId instead of stacking up duplicates. Runs every minute
 *  (not hourly, unlike whatsapp-contacts-sync) since the whole point is a session can never
 *  sit open indefinitely past 6:30 PM without a valid extension — the query itself is cheap
 *  (bounded by however many employees are currently clocked in), so a tight interval costs
 *  nothing. */
export async function scheduleAttendanceCutoff(): Promise<void> {
  await attendanceCutoffQueue.add("cutoff", {}, { repeat: { every: 60 * 1000 }, jobId: REPEAT_JOB_ID });
}
