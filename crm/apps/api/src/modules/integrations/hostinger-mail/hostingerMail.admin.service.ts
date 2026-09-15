import nodemailer from "nodemailer";
import type { Prisma } from "@prisma/client";
import {
  MAILBOX_ADDRESS,
  type MailAccountInfo,
  type MailComposeInput,
  type MailComposeResult,
  type MailConnectInput,
  type MailInboxConversation,
  type MailInboxQuery,
  type MailMessageDetail,
  type MailReplyInput,
  type MailSentMessage,
  type MailSentQuery,
  type PaginatedResult,
} from "@gifftai/shared";
import { prisma } from "../../../config/prisma";
import { env } from "../../../config/env";
import { logger } from "../../../config/logger";
import { AppError } from "../../../lib/apiError";
import { decryptSecret, encryptSecret } from "../../../lib/crypto";
import { hostingerMailClient, INBOX_FOLDER } from "./hostingerMail.client";
import { hostingerMailSmtp } from "./hostingerMail.smtp";
import { hostingerMailImap } from "./hostingerMail.imap";
import { hostingerMailRepository } from "./hostingerMail.repository";

interface HostingerMailConfig {
  mailboxAddress: string;
  aliases: string[];
  webhookSecret?: string;
  lastSeenUid: number;
}

interface HostingerMailCredentials {
  apiToken: string;
  smtpPassword: string;
  mailboxResourceId: string;
  mailboxAddress: string;
}

/** apiToken lives in accessTokenEnc; smtpPassword reuses refreshTokenEnc — the same
 *  pragmatic "second encrypted secret" reuse whatsapp.admin.service.ts documents for its
 *  own apiSecret, rather than adding a mail-only column to a table every integration
 *  shares. */
async function getCredentials(): Promise<HostingerMailCredentials | null> {
  const connection = await prisma.integrationConnection.findUnique({ where: { channelType: "EMAIL" } });
  if (!connection?.accessTokenEnc || !connection.refreshTokenEnc || !connection.externalAccountId || connection.status !== "CONNECTED") {
    return null;
  }
  const config = connection.config as unknown as HostingerMailConfig;
  return {
    apiToken: decryptSecret(connection.accessTokenEnc),
    smtpPassword: decryptSecret(connection.refreshTokenEnc),
    mailboxResourceId: connection.externalAccountId,
    mailboxAddress: config.mailboxAddress ?? MAILBOX_ADDRESS,
  };
}

async function getConfig(): Promise<HostingerMailConfig | null> {
  const connection = await prisma.integrationConnection.findUnique({ where: { channelType: "EMAIL" } });
  if (!connection) return null;
  return connection.config as unknown as HostingerMailConfig;
}

async function verifySmtpPassword(mailboxAddress: string, smtpPassword: string): Promise<void> {
  const transport = nodemailer.createTransport({
    host: "smtp.hostinger.com",
    port: 465,
    secure: true,
    auth: { user: mailboxAddress, pass: smtpPassword },
  });
  try {
    await transport.verify();
  } catch {
    throw AppError.badRequest("Could not authenticate to smtp.hostinger.com with that SMTP password");
  }
}

async function verifyApiToken(apiToken: string): Promise<{ mailboxResourceId: string; mailboxAddress: string }> {
  const account = await hostingerMailClient.getAccount({ apiToken }).catch(() => {
    throw AppError.badRequest("Could not verify this Hostinger Mail API token");
  });
  const mailbox = account.mailboxes[0];
  if (!mailbox) throw AppError.badRequest("This API token has no mailboxes assigned to it");
  return { mailboxResourceId: mailbox.resourceId, mailboxAddress: mailbox.address };
}

/** Registers (or reuses) a `message.received` webhook pointed at this app, mirroring
 *  whatsapp.admin.service.ts's ensureWebhookRegistered. Unlike WhatsApp, Hostinger does
 *  return existing webhooks on GET (so we can detect one already pointing here), but never
 *  returns a webhook's secret again after creation — if one already exists and we have no
 *  secret on file, delivery signature checks are skipped until reconnect regenerates it. */
async function ensureWebhookRegistered(apiToken: string, mailboxResourceId: string, existingSecret: string | undefined): Promise<string | undefined> {
  const webhookUrl = `${env.API_URL}/api/public/webhooks/hostinger-mail`;

  const existing = await hostingerMailClient.listWebhooks({ apiToken }, mailboxResourceId).catch((error) => {
    logger.warn({ err: error }, "Hostinger Mail listWebhooks failed during connect — attempting to create one anyway");
    return [];
  });
  if (existing.some((hook) => hook.url === webhookUrl)) {
    if (!existingSecret) {
      logger.warn("A Hostinger Mail webhook already points at this app, but no secret is on file — signature checks will be skipped for it");
    }
    return existingSecret;
  }

  return hostingerMailClient.createWebhook({ apiToken }, mailboxResourceId, webhookUrl);
}

function toMailAccountInfo(mailboxResourceId: string, mailboxAddress: string): MailAccountInfo {
  return { mailboxAddress, mailboxResourceId };
}

export const hostingerMailAdminService = {
  async connect(input: MailConnectInput, userId: string): Promise<MailAccountInfo> {
    const { mailboxResourceId, mailboxAddress } = await verifyApiToken(input.apiToken);
    await verifySmtpPassword(mailboxAddress, input.smtpPassword);

    const existing = await prisma.integrationConnection.findUnique({ where: { channelType: "EMAIL" } });
    const existingConfig = existing?.config as unknown as HostingerMailConfig | undefined;

    const webhookSecret = await ensureWebhookRegistered(input.apiToken, mailboxResourceId, existingConfig?.webhookSecret).catch((error) => {
      logger.warn({ err: error }, "Failed to register Hostinger Mail webhook during connect");
      return existingConfig?.webhookSecret;
    });

    // Baseline the sync cursor at "whatever's already in the inbox right now" rather than
    // uid 0 — otherwise the first webhook-triggered sync would try to backfill the mailbox's
    // entire history instead of only genuinely new mail from the moment of connecting.
    const { items } = await hostingerMailClient
      .listMessages({ apiToken: input.apiToken }, mailboxResourceId, INBOX_FOLDER, { page: 1, perPage: 1 })
      .catch(() => ({ items: [] }));
    const lastSeenUid = items[0]?.uid ?? 0;

    const config: HostingerMailConfig = { mailboxAddress, aliases: existingConfig?.aliases ?? [], webhookSecret, lastSeenUid };

    await prisma.integrationConnection.upsert({
      where: { channelType: "EMAIL" },
      create: {
        channelType: "EMAIL",
        status: "CONNECTED",
        accessTokenEnc: encryptSecret(input.apiToken),
        refreshTokenEnc: encryptSecret(input.smtpPassword),
        externalAccountId: mailboxResourceId,
        config: config as unknown as Prisma.InputJsonValue,
        connectedByUserId: userId,
        lastSyncedAt: new Date(),
      },
      update: {
        status: "CONNECTED",
        accessTokenEnc: encryptSecret(input.apiToken),
        refreshTokenEnc: encryptSecret(input.smtpPassword),
        externalAccountId: mailboxResourceId,
        config: config as unknown as Prisma.InputJsonValue,
        connectedByUserId: userId,
        lastError: null,
        lastSyncedAt: new Date(),
      },
    });

    return toMailAccountInfo(mailboxResourceId, mailboxAddress);
  },

  async testConnection(input: MailConnectInput): Promise<MailAccountInfo> {
    const { mailboxResourceId, mailboxAddress } = await verifyApiToken(input.apiToken);
    await verifySmtpPassword(mailboxAddress, input.smtpPassword);
    return toMailAccountInfo(mailboxResourceId, mailboxAddress);
  },

  async disconnect(): Promise<void> {
    await prisma.integrationConnection
      .update({ where: { channelType: "EMAIL" }, data: { status: "DISCONNECTED", accessTokenEnc: null, refreshTokenEnc: null } })
      .catch(() => undefined);
  },

  async resync(): Promise<{ ok: boolean; error?: string }> {
    const credentials = await getCredentials();
    if (!credentials) return { ok: false, error: "Not connected" };
    try {
      await hostingerMailClient.getAccount({ apiToken: credentials.apiToken });
      await prisma.integrationConnection.update({ where: { channelType: "EMAIL" }, data: { lastSyncedAt: new Date(), lastError: null, status: "CONNECTED" } });
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await prisma.integrationConnection.update({ where: { channelType: "EMAIL" }, data: { status: "ERROR", lastError: message } });
      return { ok: false, error: message };
    }
  },

  getCredentials,
  getConfig,

  async setLastSeenUid(uid: number): Promise<void> {
    const config = await getConfig();
    if (!config) return;
    await prisma.integrationConnection.update({
      where: { channelType: "EMAIL" },
      data: { config: { ...config, lastSeenUid: uid } as unknown as Prisma.InputJsonValue },
    });
  },

  /** Backs the Mail Inbox page's conversation list — DB-backed (not a live Hostinger call)
   *  so pagination/search/unread state are fast and consistent regardless of Hostinger API
   *  latency; populated by the webhook-triggered ingestion pipeline, same architecture as
   *  WhatsApp/Telegram's inbox lists. */
  async listInbox(query: MailInboxQuery): Promise<PaginatedResult<MailInboxConversation>> {
    const channel = await prisma.channel.findFirst({ where: { type: "EMAIL" } });
    if (!channel) return { items: [], page: query.page, pageSize: query.pageSize, total: 0, totalPages: 1 };

    const where: Prisma.ConversationWhereInput = {
      channelId: channel.id,
      ...(query.search
        ? {
            OR: [
              { subject: { contains: query.search, mode: "insensitive" } },
              { lead: { OR: [{ firstName: { contains: query.search, mode: "insensitive" } }, { lastName: { contains: query.search, mode: "insensitive" } }, { email: { contains: query.search, mode: "insensitive" } }] } },
              { contact: { OR: [{ firstName: { contains: query.search, mode: "insensitive" } }, { lastName: { contains: query.search, mode: "insensitive" } }, { email: { contains: query.search, mode: "insensitive" } }] } },
            ],
          }
        : {}),
    };

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        include: {
          lead: { select: { id: true, firstName: true, lastName: true } },
          contact: { select: { id: true, firstName: true, lastName: true } },
          messages: { orderBy: { createdAt: "desc" }, take: 1, include: { emailDetail: true } },
        },
        orderBy: { lastMessageAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.conversation.count({ where }),
    ]);

    const items: MailInboxConversation[] = conversations.map((conversation) => {
      const last = conversation.messages[0];
      return {
        id: conversation.id,
        leadId: conversation.lead?.id ?? null,
        leadName: conversation.lead ? `${conversation.lead.firstName} ${conversation.lead.lastName}`.trim() : null,
        contactId: conversation.contact?.id ?? null,
        contactName: conversation.contact ? `${conversation.contact.firstName} ${conversation.contact.lastName}`.trim() : null,
        participantEmail: last?.emailDetail?.fromAddress ?? null,
        mailboxAddress: last?.emailDetail?.mailboxAddress ?? null,
        subject: conversation.subject,
        lastMessageBody: last?.body ?? null,
        lastMessageAt: conversation.lastMessageAt?.toISOString() ?? null,
        lastMessageSenderType: last?.senderType ?? null,
        unreadCount: conversation.unreadCount,
      };
    });

    return { items, page: query.page, pageSize: query.pageSize, total, totalPages: Math.max(1, Math.ceil(total / query.pageSize)) };
  },

  async listConversationMessages(conversationId: string): Promise<MailMessageDetail[]> {
    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      include: { emailDetail: true },
    });

    return messages.map((message) => ({
      id: message.id,
      senderType: message.senderType,
      body: message.body,
      isRead: message.isRead,
      createdAt: message.createdAt.toISOString(),
      fromAddress: message.emailDetail?.fromAddress ?? null,
      fromName: message.emailDetail?.fromName ?? null,
      toAddresses: (message.emailDetail?.toAddresses as string[] | undefined) ?? [],
      ccAddresses: (message.emailDetail?.ccAddresses as string[] | undefined) ?? [],
      mailboxAddress: message.emailDetail?.mailboxAddress ?? null,
      hasAttachments: message.emailDetail?.hasAttachments ?? false,
    }));
  },

  /** Marks every unread inbound message in the thread read locally, then best-effort pushes
   *  `\Seen` to Hostinger for each so webmail/other clients agree — a failure here doesn't
   *  fail the request, since the CRM's own isRead is the source of truth for this UI. */
  async markConversationRead(conversationId: string): Promise<void> {
    const unread = await prisma.message.findMany({
      where: { conversationId, senderType: "CONTACT", isRead: false },
      include: { emailDetail: true },
    });
    if (unread.length === 0) return;

    await prisma.message.updateMany({ where: { id: { in: unread.map((m) => m.id) } }, data: { isRead: true } });
    await prisma.conversation.update({ where: { id: conversationId }, data: { unreadCount: 0 } });

    const credentials = await getCredentials();
    if (!credentials) return;
    for (const message of unread) {
      if (!message.emailDetail) continue;
      await hostingerMailClient
        .setMessageFlags(credentials, credentials.mailboxResourceId, message.emailDetail.hostingerFolder, message.emailDetail.hostingerUid, { addFlags: ["\\Seen"] })
        .catch((error) => logger.warn({ err: error, messageId: message.id }, "Failed to push \\Seen flag to Hostinger"));
    }
  },

  async reply(conversationId: string, input: MailReplyInput, actorId: string): Promise<void> {
    const credentials = await getCredentials();
    if (!credentials) throw AppError.badRequest("Hostinger Mail is not connected");

    const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conversation) throw AppError.notFound("Conversation not found");

    const latestInbound = await hostingerMailRepository.getLatestInboundMessage(conversationId);
    const toAddress = latestInbound?.emailDetail?.fromAddress;
    if (!toAddress) throw AppError.badRequest("This conversation has no inbound message to reply to yet");

    const fromAddress = input.from ?? latestInbound.emailDetail?.mailboxAddress ?? credentials.mailboxAddress;
    const subject = conversation.subject ? (conversation.subject.startsWith("Re:") ? conversation.subject : `Re: ${conversation.subject}`) : "Re:";
    const smtpCredentials = { mailboxAddress: credentials.mailboxAddress, smtpPassword: credentials.smtpPassword };

    const sent = await hostingerMailSmtp
      .send(smtpCredentials, {
        from: fromAddress,
        to: [toAddress],
        subject,
        body: input.body,
        inReplyToMessageId: latestInbound.emailDetail?.hostingerMessageId,
      })
      .catch(() => {
        throw AppError.badRequest("Failed to send the reply — check the SMTP password is still valid");
      });

    // Best-effort: mirrors this send into Hostinger's own INBOX.Sent via IMAP APPEND (see
    // hostingerMail.imap.ts's module comment for why SMTP alone doesn't do this).
    // appendToSent never throws — it catches and logs internally — so awaiting it here
    // can't fail the reply; the message already sent either way, and the CRM's own
    // DB-backed Sent tab has it regardless of whether this succeeds.
    await hostingerMailImap.appendToSent(smtpCredentials, sent.raw);

    await hostingerMailRepository.recordOutboundMessage({
      conversationId,
      senderId: actorId,
      body: input.body,
      hostingerMessageId: sent.messageId,
      mailboxAddress: fromAddress,
      to: [toAddress],
      cc: [],
      inReplyToMessageId: latestInbound.emailDetail?.hostingerMessageId,
    });
  },

  async compose(input: MailComposeInput, actorId: string): Promise<MailComposeResult> {
    const credentials = await getCredentials();
    if (!credentials) throw AppError.badRequest("Hostinger Mail is not connected");

    const smtpCredentials = { mailboxAddress: credentials.mailboxAddress, smtpPassword: credentials.smtpPassword };
    const sent = await hostingerMailSmtp
      .send(smtpCredentials, { from: input.from, to: input.to, cc: input.cc, bcc: input.bcc, subject: input.subject, body: input.body })
      .catch(() => {
        throw AppError.badRequest("Failed to send — check the SMTP password is still valid");
      });

    // Best-effort mirror into Hostinger's own INBOX.Sent — see reply()'s identical step and
    // hostingerMail.imap.ts's module comment.
    await hostingerMailImap.appendToSent(smtpCredentials, sent.raw);

    const conversationId = await hostingerMailRepository.findOrCreateConversationForRecipient({ toAddress: input.to[0]!, subject: input.subject });
    await hostingerMailRepository.recordOutboundMessage({
      conversationId,
      senderId: actorId,
      body: input.body,
      hostingerMessageId: sent.messageId,
      mailboxAddress: input.from,
      to: input.to,
      cc: input.cc,
    });

    return { conversationId };
  },

  /** DB-backed, not a live Hostinger folder proxy — confirmed empirically against the live
   *  API that mail sent over SMTP (required for alias-based From) is never copied into
   *  INBOX.Sent by Hostinger: 8 real test sends across all 7 aliases stayed invisible there
   *  15+ minutes later, while pre-existing webmail-sent history remained the only content.
   *  reply()/compose() now also IMAP-APPEND a copy into INBOX.Sent as a best-effort side
   *  effect (hostingerMail.imap.ts) so Hostinger's own Sent folder and webmail agree too —
   *  but that's a mirror, not this tab's source of truth: it can silently fail (network
   *  blip, IMAP disabled on the token, etc.) without this method knowing, so staying
   *  DB-backed off hostingerMailRepository.recordOutboundMessage's write (which never fails
   *  independently of the send itself) keeps this list reliable regardless. The one thing
   *  neither source can show is mail sent from webmail directly, before the APPEND existed
   *  or if the account somehow bypassed it. */
  async listSent(query: MailSentQuery): Promise<PaginatedResult<MailSentMessage>> {
    const channel = await prisma.channel.findFirst({ where: { type: "EMAIL" } });
    if (!channel) return { items: [], page: query.page, pageSize: query.pageSize, total: 0, totalPages: 1 };

    const where: Prisma.MessageWhereInput = {
      senderType: "AGENT",
      conversation: { channelId: channel.id },
      ...(query.search
        ? {
            OR: [
              { body: { contains: query.search, mode: "insensitive" } },
              { conversation: { subject: { contains: query.search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        include: { conversation: { select: { id: true, subject: true } }, emailDetail: true },
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.message.count({ where }),
    ]);

    const items: MailSentMessage[] = messages.map((message) => ({
      id: message.id,
      conversationId: message.conversationId,
      subject: message.conversation.subject,
      from: message.emailDetail?.fromAddress ?? null,
      to: (message.emailDetail?.toAddresses as string[] | undefined) ?? [],
      date: message.createdAt.toISOString(),
      snippet: message.body.length > 200 ? `${message.body.slice(0, 200)}…` : message.body,
    }));

    return { items, page: query.page, pageSize: query.pageSize, total, totalPages: Math.max(1, Math.ceil(total / query.pageSize)) };
  },
};
