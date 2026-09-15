import type { Job } from "bullmq";
import { whatsappAdminService } from "../../modules/integrations/whatsapp/whatsapp.admin.service";

export async function whatsappHistoryImportProcessor(_job: Job): Promise<void> {
  await whatsappAdminService.importHistory();
}
