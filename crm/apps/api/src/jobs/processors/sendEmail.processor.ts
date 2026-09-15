import type { Job } from "bullmq";
import type { EmailJobData } from "../queues/email.queue";
import { mailer } from "../../lib/mailer";
import { env } from "../../config/env";
import { logger } from "../../config/logger";

export async function sendEmailProcessor(job: Job<EmailJobData>): Promise<void> {
  const { to, subject, html } = job.data;

  await mailer.sendMail({ from: env.SMTP_FROM, to, subject, html });

  logger.info({ jobId: job.id, to, subject }, "Email sent");
}
