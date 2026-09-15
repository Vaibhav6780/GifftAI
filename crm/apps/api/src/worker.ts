import { startEmailWorker } from "./jobs/workers/email.worker";
import { startTelegramInboundWorker } from "./jobs/workers/telegramInbound.worker";
import { startWhatsappInboundWorker } from "./jobs/workers/whatsappInbound.worker";
import { startHostingerMailInboundWorker } from "./jobs/workers/hostingerMailInbound.worker";
import { startWhatsappHistoryImportWorker } from "./jobs/workers/whatsappHistoryImport.worker";
import { startInstagramInboundWorker } from "./jobs/workers/instagramInbound.worker";
import { startIntegrationTokenRefreshWorker } from "./jobs/workers/integrationTokenRefresh.worker";
import { scheduleIntegrationTokenRefresh } from "./jobs/queues/integrationTokenRefresh.queue";
import { startWhatsappContactsSyncWorker } from "./jobs/workers/whatsappContactsSync.worker";
import { scheduleWhatsappContactsSync } from "./jobs/queues/whatsappContactsSync.queue";
import { startIntegrationsAutoSyncWorker } from "./jobs/workers/integrationsAutoSync.worker";
import { scheduleIntegrationsAutoSync } from "./jobs/queues/integrationsAutoSync.queue";
import { startAttendanceCutoffWorker } from "./jobs/workers/attendanceCutoff.worker";
import { scheduleAttendanceCutoff } from "./jobs/queues/attendanceCutoff.queue";
import { startTelegramPollingLoop } from "./modules/integrations/telegram/telegram.polling";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { prisma } from "./config/prisma";
import { bullmqConnection } from "./config/redis";

const emailWorker = startEmailWorker();
const telegramInboundWorker = startTelegramInboundWorker();
const whatsappInboundWorker = startWhatsappInboundWorker();
const hostingerMailInboundWorker = startHostingerMailInboundWorker();
const whatsappHistoryImportWorker = startWhatsappHistoryImportWorker();
const instagramInboundWorker = startInstagramInboundWorker();
const integrationTokenRefreshWorker = startIntegrationTokenRefreshWorker();
const whatsappContactsSyncWorker = startWhatsappContactsSyncWorker();
const integrationsAutoSyncWorker = startIntegrationsAutoSyncWorker();
const attendanceCutoffWorker = startAttendanceCutoffWorker();

// "polling" needs no public HTTPS URL — useful for local dev without a tunnel. "webhook"
// (default) relies on Telegram calling POST /public/webhooks/telegram instead.
const telegramPolling = env.TELEGRAM_MODE === "polling" ? startTelegramPollingLoop() : null;

void scheduleIntegrationTokenRefresh();
void scheduleWhatsappContactsSync();
void scheduleIntegrationsAutoSync();
void scheduleAttendanceCutoff();

logger.info(
  `Background worker process started (queues: email, telegram-inbound, whatsapp-inbound, whatsapp-history-import, instagram-inbound, integration-token-refresh, whatsapp-contacts-sync, integrations-auto-sync, attendance-cutoff, hostinger-mail-inbound; telegram mode: ${env.TELEGRAM_MODE})`,
);

async function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down worker gracefully`);
  await telegramPolling?.stop();
  await emailWorker.close();
  await telegramInboundWorker.close();
  await whatsappInboundWorker.close();
  await hostingerMailInboundWorker.close();
  await whatsappHistoryImportWorker.close();
  await instagramInboundWorker.close();
  await integrationTokenRefreshWorker.close();
  await whatsappContactsSyncWorker.close();
  await integrationsAutoSyncWorker.close();
  await attendanceCutoffWorker.close();
  await prisma.$disconnect();
  bullmqConnection.disconnect();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
