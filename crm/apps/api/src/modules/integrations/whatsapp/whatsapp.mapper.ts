import { logger } from "../../../config/logger";
import type { NormalizedInboundLead } from "../../lead-ingestion/types";
import { normalizeWahamsterPhone, type WahamsterContact, type WahamsterMessage } from "./whatsapp.service";

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/** GET /contacts row → lead. Used by the "Sync Contacts" admin action. */
export function mapWahamsterContactToLead(contact: WahamsterContact): NormalizedInboundLead | null {
  const digits = normalizeWahamsterPhone(contact.phone);
  if (!digits) return null;

  return {
    source: "WHATSAPP",
    externalUserId: digits,
    phone: `+${digits}`,
    firstName: contact.name ?? undefined,
    company: contact.company ?? undefined,
    occurredAt: contact.lastContact ? new Date(contact.lastContact) : new Date(contact.createdAt),
    raw: contact,
  };
}

/** GET /messages/{phone} row → lead + timeline message. Used by per-lead "Sync history".
 *  Outbound rows (our own replies) never create/touch a lead — only inbound ones do. */
export function mapWahamsterMessageToLead(phone: string, message: WahamsterMessage): NormalizedInboundLead | null {
  if (message.direction !== "inbound") return null;
  const digits = normalizeWahamsterPhone(phone);
  if (!digits) return null;

  return {
    source: "WHATSAPP",
    externalUserId: digits,
    externalConversationId: digits,
    externalMessageId: message.whatsappMessageId ?? message.id,
    phone: `+${digits}`,
    message: message.content ?? undefined,
    occurredAt: new Date(message.timestamp ?? message.createdAt),
    attachments: message.mediaUrl
      ? [
          {
            sourceUrl: message.mediaUrl,
            fileName: `whatsapp-${message.id}`,
            mimeType: message.mediaMimeType ?? "application/octet-stream",
          },
        ]
      : undefined,
    raw: message,
  };
}

/**
 * Inbound webhook payload → lead. The exact shape is undocumented (see wahamster.client.ts's
 * module comment) — whatsapp.webhook.controller.ts always logs the raw payload first, so this
 * defensively probes several plausible field names/nesting rather than trusting one shape.
 * Update this once a real `message.received` delivery has been observed in the logs.
 */
export function mapWebhookMessageReceived(payload: unknown): NormalizedInboundLead | null {
  const root = asRecord(payload);
  if (!root) return null;

  // The message-like object may be the payload itself, or nested under a common wrapper key.
  const data = asRecord(root.data) ?? asRecord(root.message) ?? root;

  const contact = asRecord(data.contact);
  const rawPhone = asString(data.phone) ?? asString(data.from) ?? asString(contact?.phone) ?? asString(root.phone);

  if (!rawPhone) {
    logger.warn({ payload }, "WhatsApp webhook message.received had no recognizable phone field — dropping");
    return null;
  }

  const digits = normalizeWahamsterPhone(rawPhone);
  if (!digits) return null;

  const content = asString(data.content) ?? asString(data.text) ?? asString(data.message);
  const messageId = asString(data.whatsappMessageId) ?? asString(data.id) ?? asString(data.messageId);
  const timestamp = asString(data.timestamp) ?? asString(data.createdAt);
  const mediaUrl = asString(data.mediaUrl) ?? asString(asRecord(data.media)?.url);
  const name = asString(contact?.name) ?? asString(data.name) ?? asString(data.senderName);

  return {
    source: "WHATSAPP",
    externalUserId: digits,
    externalConversationId: digits,
    externalMessageId: messageId,
    phone: `+${digits}`,
    firstName: name,
    message: content,
    occurredAt: timestamp ? new Date(timestamp) : new Date(),
    attachments: mediaUrl
      ? [{ sourceUrl: mediaUrl, fileName: `whatsapp-${messageId ?? Date.now()}`, mimeType: asString(data.mediaMimeType) ?? "application/octet-stream" }]
      : undefined,
    raw: payload,
  };
}

export interface WebhookMessageStatusEvent {
  externalMessageId: string;
  status: string;
}

/** Same undocumented-shape caveat as mapWebhookMessageReceived above. */
export function extractWebhookMessageStatus(payload: unknown): WebhookMessageStatusEvent | null {
  const root = asRecord(payload);
  if (!root) return null;

  const data = asRecord(root.data) ?? root;
  const externalMessageId = asString(data.whatsappMessageId) ?? asString(data.id) ?? asString(data.messageId);
  const status = asString(data.status);

  if (!externalMessageId || !status) {
    logger.warn({ payload }, "WhatsApp webhook message.status missing id/status — dropping");
    return null;
  }

  return { externalMessageId, status };
}
