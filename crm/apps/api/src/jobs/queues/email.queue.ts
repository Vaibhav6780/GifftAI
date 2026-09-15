import { Queue } from "bullmq";
import { bullmqConnection } from "../../config/redis";

export interface EmailJobData {
  to: string;
  subject: string;
  html: string;
}

export const EMAIL_QUEUE_NAME = "email";

export const emailQueue = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, {
  connection: bullmqConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});
