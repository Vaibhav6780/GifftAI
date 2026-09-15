import { Worker } from "bullmq";
import { bullmqConnection } from "../../config/redis";
import { EMAIL_QUEUE_NAME } from "../queues/email.queue";
import { sendEmailProcessor } from "../processors/sendEmail.processor";
import { logger } from "../../config/logger";

export function startEmailWorker(): Worker {
  const worker = new Worker(EMAIL_QUEUE_NAME, sendEmailProcessor, {
    connection: bullmqConnection,
    concurrency: 5,
  });

  worker.on("completed", (job) => logger.info({ jobId: job.id }, "Email job completed"));
  worker.on("failed", (job, err) => logger.error({ jobId: job?.id, err }, "Email job failed"));

  return worker;
}
