import type { Job } from "bullmq";
import { logger } from "../../config/logger";
import { mapInstagramMessagingEvent } from "../../modules/integrations/instagram/instagram.mapper";
import { instagramAdminService } from "../../modules/integrations/instagram/instagram.admin.service";
import { leadIngestionService } from "../../modules/lead-ingestion/lead-ingestion.service";
import type { InstagramInboundJobData } from "../queues/instagramInbound.queue";

export async function instagramInboundProcessor(job: Job<InstagramInboundJobData>): Promise<void> {
  const accessToken = await instagramAdminService.getAccessToken();
  if (!accessToken) {
    logger.warn({ jobId: job.id }, "Instagram disconnected since this update was enqueued — dropping");
    return;
  }

  const lead = await mapInstagramMessagingEvent(job.data.event, accessToken);
  if (!lead) return;

  await leadIngestionService.ingest(lead);
}
