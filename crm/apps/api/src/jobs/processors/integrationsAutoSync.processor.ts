import type { IntegrationChannelType } from "@gifftai/shared";
import { prisma } from "../../config/prisma";
import { logger } from "../../config/logger";
import { integrationsAdminService } from "../../modules/integrations/admin/integrations-admin.service";

const SYNCABLE_CHANNEL_TYPES = ["INSTAGRAM", "WHATSAPP", "LINKEDIN", "TELEGRAM"] as const;

/** Hourly automatic sync for every connected platform (Telegram, WhatsApp, Instagram,
 *  LinkedIn) — runs the same resync() the "Re-sync now" button triggers, so connection
 *  health and lastSyncedAt stay fresh without anyone needing to visit Settings. */
export async function integrationsAutoSyncProcessor(): Promise<void> {
  const connections = await prisma.integrationConnection.findMany({
    where: { status: "CONNECTED", channelType: { in: [...SYNCABLE_CHANNEL_TYPES] } },
  });

  for (const connection of connections) {
    const channelType = connection.channelType as IntegrationChannelType;
    const result = await integrationsAdminService.resync(channelType);
    logger.info({ channelType, ok: result.ok, error: result.error }, "Integrations auto-sync attempted");
  }
}
