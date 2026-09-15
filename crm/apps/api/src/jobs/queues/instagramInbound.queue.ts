import { Queue } from "bullmq";
import { bullmqConnection } from "../../config/redis";
import type { InstagramMessagingEvent } from "../../modules/integrations/instagram/instagram.service";

export interface InstagramInboundJobData {
  event: InstagramMessagingEvent;
}

export const INSTAGRAM_INBOUND_QUEUE_NAME = "instagram-inbound";

export const instagramInboundQueue = new Queue<InstagramInboundJobData>(INSTAGRAM_INBOUND_QUEUE_NAME, {
  connection: bullmqConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});
