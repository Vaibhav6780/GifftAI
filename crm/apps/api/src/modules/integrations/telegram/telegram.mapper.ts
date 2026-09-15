import type { NormalizedInboundAttachment, NormalizedInboundLead } from "../../lead-ingestion/types";
import { telegramService, type TelegramUpdate } from "./telegram.service";

/** Ignores updates with no `message` (edited_message, channel_post, callback_query, ...) —
 *  those aren't inbound lead inquiries. Only text/caption, photo, document, and shared
 *  contact-card content are mapped for v1. */
export async function mapTelegramUpdate(update: TelegramUpdate, botToken: string): Promise<NormalizedInboundLead | null> {
  const message = update.message;
  if (!message?.from) return null;

  const attachments: NormalizedInboundAttachment[] = [];

  if (message.document) {
    const sourceUrl = await telegramService.getFileDownloadUrl(botToken, message.document.file_id);
    if (sourceUrl) {
      attachments.push({
        sourceUrl,
        fileName: message.document.file_name ?? `document-${message.document.file_id}`,
        mimeType: message.document.mime_type ?? "application/octet-stream",
        size: message.document.file_size,
      });
    }
  }

  if (message.photo?.length) {
    const largest = message.photo[message.photo.length - 1]!;
    const sourceUrl = await telegramService.getFileDownloadUrl(botToken, largest.file_id);
    if (sourceUrl) {
      attachments.push({
        sourceUrl,
        fileName: `photo-${largest.file_unique_id}.jpg`,
        mimeType: "image/jpeg",
        size: largest.file_size,
      });
    }
  }

  return {
    source: "TELEGRAM",
    externalUserId: String(message.from.id),
    externalConversationId: String(message.chat.id),
    externalMessageId: String(message.message_id),
    firstName: message.from.first_name,
    lastName: message.from.last_name,
    username: message.from.username,
    profileUrl: message.from.username ? `https://t.me/${message.from.username}` : undefined,
    phone: message.contact?.phone_number,
    message: message.text ?? message.caption,
    occurredAt: new Date(message.date * 1000),
    attachments: attachments.length ? attachments : undefined,
    raw: update,
  };
}
