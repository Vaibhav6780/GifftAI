import type { Job } from "bullmq";
import { logger } from "../../config/logger";
import { extractWebhookMessageStatus, mapWebhookMessageReceived } from "../../modules/integrations/whatsapp/whatsapp.mapper";
import { whatsappRepository } from "../../modules/integrations/whatsapp/whatsapp.repository";
import { leadIngestionService } from "../../modules/lead-ingestion/lead-ingestion.service";
import type { WhatsappInboundJobData } from "../queues/whatsappInbound.queue";

export async function whatsappInboundProcessor(job: Job<WhatsappInboundJobData>): Promise<void> {
  const { event, payload } = job.data;

  if (event === "message.received") {
    const lead = mapWebhookMessageReceived(payload);
    if (!lead) return;
    await leadIngestionService.ingest(lead);
    return;
  }

  if (event === "message.status") {
    const statusEvent = extractWebhookMessageStatus(payload);
    if (!statusEvent) return;
    const applied = await whatsappRepository.updateMessageStatusByExternalId(statusEvent.externalMessageId, statusEvent.status);
    if (!applied) {
      logger.warn({ jobId: job.id, statusEvent }, "WhatsApp message.status referenced a message this CRM never recorded — dropping");
    }
    return;
  }

  logger.warn({ jobId: job.id, event }, "Unknown WhatsApp webhook event — dropping");
}
