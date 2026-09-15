import type { Job } from "bullmq";
import { logger } from "../../config/logger";
import { mapTelegramUpdate } from "../../modules/integrations/telegram/telegram.mapper";
import { telegramAdminService } from "../../modules/integrations/telegram/telegram.admin.service";
import { leadIngestionService } from "../../modules/lead-ingestion/lead-ingestion.service";
import type { TelegramInboundJobData } from "../queues/telegramInbound.queue";

export async function telegramInboundProcessor(job: Job<TelegramInboundJobData>): Promise<void> {
  const botToken = await telegramAdminService.getBotToken();
  if (!botToken) {
    logger.warn({ jobId: job.id }, "Telegram disconnected since this update was enqueued — dropping");
    return;
  }

  const lead = await mapTelegramUpdate(job.data.update, botToken);
  if (!lead) return;

  await leadIngestionService.ingest(lead);
}
