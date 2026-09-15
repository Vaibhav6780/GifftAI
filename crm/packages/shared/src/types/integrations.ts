/** Website has no OAuth/webhook connection of its own — it's always-on and shown as a
 *  static pseudo-row alongside the 5 real IntegrationConnection-backed platforms. */
export type IntegrationChannelType = "WEBSITE" | "INSTAGRAM" | "WHATSAPP" | "LINKEDIN" | "TELEGRAM" | "EMAIL";

export type IntegrationStatus = "CONNECTED" | "DISCONNECTED" | "ERROR" | "PENDING";

export interface IntegrationConnectionSummary {
  channelType: IntegrationChannelType;
  status: IntegrationStatus;
  externalAccountId: string | null;
  /** True if a token is stored — the token itself is never returned to the client. */
  hasToken: boolean;
  tokenExpiresAt: string | null;
  lastSyncedAt: string | null;
  lastError: string | null;
  connectedByName: string | null;
  createdAt: string | null;
}

export interface LinkedInImportResult {
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
}

/** GET /account on the WaHamster side — surfaced by both the connect flow and the
 *  standalone "Test Connection" button (which never persists anything). */
export interface WhatsappAccountInfo {
  channelName: string;
  phoneNumber: string;
  healthStatus: string;
}

export interface WhatsappSyncContactsResult {
  imported: number;
  updated: number;
  skipped: number;
}

export interface WhatsappSyncConversationResult {
  synced: number;
}

export interface LeadTimelineEntry {
  id: string;
  kind: "activity" | "message" | "attachment";
  occurredAt: string;
  /** e.g. "lead.ingested", "lead.updated" for activities; sender type for messages. */
  label: string;
  body: string | null;
  metadata: Record<string, unknown> | null;
}

export type WhatsappHistoryImportStatus = "IDLE" | "RUNNING" | "COMPLETED" | "FAILED";

/** Progress of the bulk "Import WhatsApp History" background job — persisted in
 *  IntegrationConnection.config.historyImport and polled by the Settings UI. */
export interface WhatsappHistoryImportProgress {
  status: WhatsappHistoryImportStatus;
  startedAt: string | null;
  finishedAt: string | null;
  contactsProcessed: number;
  /** Contacts whose message history failed to fetch/import (e.g. a 404 from the WhatsApp
   *  API for that specific contact) — logged and skipped rather than aborting the run. */
  contactsSkipped: number;
  leadsImported: number;
  leadsUpdated: number;
  messagesImported: number;
  error: string | null;
}

/** One row in the WhatsApp Inbox conversation list. */
export interface WhatsappInboxConversation {
  id: string;
  leadId: string;
  leadName: string;
  phone: string | null;
  lastMessageBody: string | null;
  lastMessageAt: string | null;
  lastMessageSenderType: string | null;
  unreadCount: number;
}

/** One row in the Telegram Inbox conversation list. username comes from
 *  LeadExternalIdentity (Telegram has no phone number); chatId is the raw numeric chat id,
 *  shown as a fallback when the lead never set a @username. */
export interface TelegramInboxConversation {
  id: string;
  leadId: string;
  leadName: string;
  username: string | null;
  chatId: string;
  lastMessageBody: string | null;
  lastMessageAt: string | null;
  lastMessageSenderType: string | null;
  unreadCount: number;
}

/** GET /me on the Hostinger Mail side — surfaced by both the connect flow and the
 *  standalone "Test Connection" button. */
export interface MailAccountInfo {
  mailboxAddress: string;
  mailboxResourceId: string;
}

/** One row in the Mail Inbox conversation list — unlike WhatsApp/Telegram this isn't
 *  necessarily tied to a lead (a support@ email from a stranger is still a real inbox item),
 *  so leadId/contactId/participant name are all nullable. */
export interface MailInboxConversation {
  id: string;
  leadId: string | null;
  leadName: string | null;
  contactId: string | null;
  contactName: string | null;
  /** The other party's email address — the lead/contact name is shown instead when matched. */
  participantEmail: string | null;
  /** Which of the 8 mailbox addresses this thread came in on (support@ or one alias). */
  mailboxAddress: string | null;
  subject: string | null;
  lastMessageBody: string | null;
  lastMessageAt: string | null;
  lastMessageSenderType: string | null;
  unreadCount: number;
}

export interface MailMessageDetail {
  id: string;
  senderType: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  fromAddress: string | null;
  fromName: string | null;
  toAddresses: string[];
  ccAddresses: string[];
  mailboxAddress: string | null;
  hasAttachments: boolean;
}

/** One row in the Sent tab. DB-backed (every AGENT-sent Message on the EMAIL channel) —
 *  NOT a live Hostinger folder proxy. Confirmed empirically against the live API: mail sent
 *  over SMTP (required for alias-based From, see hostingerMail.smtp.ts) is never copied
 *  into INBOX.Sent by Hostinger, so that folder only ever reflects mail sent from webmail
 *  directly and would never show anything sent through this CRM. See
 *  hostingerMail.admin.service.ts#listSent. */
export interface MailSentMessage {
  id: string;
  conversationId: string;
  subject: string | null;
  from: string | null;
  to: string[];
  date: string;
  snippet: string;
}

export interface MailComposeResult {
  conversationId: string;
}

