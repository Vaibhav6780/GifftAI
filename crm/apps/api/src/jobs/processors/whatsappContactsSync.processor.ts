import { prisma } from "../../config/prisma";
import { logger } from "../../config/logger";
import { whatsappAdminService } from "../../modules/integrations/whatsapp/whatsapp.admin.service";

/** Hourly backfill safety net alongside the real-time `message.received` webhook — catches
 *  any WaHamster contacts created/edited without ever messaging in, or missed during a
 *  webhook outage. No-ops (not an error) whenever WhatsApp isn't connected. */
export async function whatsappContactsSyncProcessor(): Promise<void> {
  const connection = await prisma.integrationConnection.findUnique({ where: { channelType: "WHATSAPP" } });
  if (!connection || connection.status !== "CONNECTED") return;

  const result = await whatsappAdminService.syncContacts();
  logger.info(result, "Hourly WhatsApp contacts sync completed");
}
