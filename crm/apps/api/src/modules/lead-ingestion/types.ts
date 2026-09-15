import type { LeadDetail } from "@gifftai/shared";

export type LeadIngestionSource = "WEBSITE" | "TELEGRAM" | "WHATSAPP" | "INSTAGRAM" | "LINKEDIN";

export interface NormalizedInboundAttachment {
  /** Platform CDN URL to download — the ingestion service fetches the bytes itself. */
  sourceUrl?: string;
  /** Already-downloaded bytes, if the adapter fetched them ahead of time. */
  buffer?: Buffer;
  fileName: string;
  mimeType: string;
  size?: number;
}

/**
 * The one shape every source adapter (website/telegram/whatsapp/instagram/linkedin)
 * produces before handing off to leadIngestionService.ingest(). Keeping every platform's
 * translation logic isolated to its own mapper, converging here, is what makes the
 * pipeline "unified" — dedup, timelining, and attachment handling are written once.
 */
export interface NormalizedInboundLead {
  source: LeadIngestionSource;
  /** Platform-scoped user/chat id. Required for messaging sources; absent for WEBSITE and
   *  LinkedIn CSV rows (those have no ongoing conversation identity to dedupe against). */
  externalUserId?: string;
  /** Platform thread/chat id. Absent when no Conversation applies. */
  externalConversationId?: string;
  /** Platform message id, for idempotent re-delivery handling. */
  externalMessageId?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  profileUrl?: string;
  company?: string;
  email?: string;
  phone?: string;
  message?: string;
  occurredAt: Date;
  attachments?: NormalizedInboundAttachment[];
  /** Trimmed into Activity.metadata for audit/debugging — never logged with secrets. */
  raw?: unknown;
}

export interface IngestResult {
  lead: LeadDetail;
  created: boolean;
  conversationId?: string;
}
