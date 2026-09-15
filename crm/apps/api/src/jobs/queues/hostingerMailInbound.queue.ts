import { Queue } from "bullmq";
import { bullmqConnection } from "../../config/redis";

/** Enqueued once per `message.received` webhook delivery — carries no payload, since the
 *  handler resyncs from the stored uid cursor rather than trusting the (undocumented)
 *  webhook body shape. See hostingerMail.webhook.controller.ts. */
export type HostingerMailInboundJobData = Record<string, never>;

export const HOSTINGER_MAIL_INBOUND_QUEUE_NAME = "hostinger-mail-inbound";

export const hostingerMailInboundQueue = new Queue<HostingerMailInboundJobData>(HOSTINGER_MAIL_INBOUND_QUEUE_NAME, {
  connection: bullmqConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});
