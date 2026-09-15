import { Worker } from "bullmq";
import { bullmqConnection } from "../../config/redis";
import { logger } from "../../config/logger";
import { ATTENDANCE_CUTOFF_QUEUE_NAME } from "../queues/attendanceCutoff.queue";
import { attendanceCutoffProcessor } from "../processors/attendanceCutoff.processor";

export function startAttendanceCutoffWorker(): Worker {
  const worker = new Worker(ATTENDANCE_CUTOFF_QUEUE_NAME, attendanceCutoffProcessor, {
    connection: bullmqConnection,
    concurrency: 1,
  });
  worker.on("failed", (job, err) => logger.error({ jobId: job?.id, err }, "Attendance cutoff job failed"));
  return worker;
}
