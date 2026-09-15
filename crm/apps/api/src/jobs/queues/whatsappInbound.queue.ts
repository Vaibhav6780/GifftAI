import { Queue } from "bullmq";
import { bullmqConnection } from "../../config/redis";

export type WhatsappWebhookEvent = "message.received" | "message.status";

export interface WhatsappInboundJobData {
  event: WhatsappWebhookEvent;
  /** Raw webhook payload — shape is undocumented, see wahamster.client.ts's module
   *  comment. Parsed defensively in whatsapp.mapper.ts. */
  payload: unknown;
}

export const WHATSAPP_INBOUND_QUEUE_NAME = "whatsapp-inbound";

export const whatsappInboundQueue = new Queue<WhatsappInboundJobData>(WHATSAPP_INBOUND_QUEUE_NAME, {
  connection: bullmqConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});
