import crypto from "node:crypto";
import type { Prisma } from "@prisma/client";
import type {
  PaginatedResult,
  WhatsappAccountInfo,
  WhatsappConnectInput,
  WhatsappHistoryImportProgress,
  WhatsappInboxConversation,
  WhatsappInboxQuery,
  WhatsappSyncContactsResult,
  WhatsappSyncConversationResult,
} from "@gifftai/shared";
import { prisma } from "../../../config/prisma";
import { env } from "../../../config/env";
import { logger } from "../../../config/logger";
import { AppError } from "../../../lib/apiError";
import { decryptSecret, encryptSecret } from "../../../lib/crypto";
import { leadIngestionService } from "../../lead-ingestion/lead-ingestion.service";
import {
  normalizeWahamsterPhone,
  whatsappService,
  WahamsterApiError,
  type WahamsterAccount,
  type WhatsappCredentials,
} from "./whatsapp.service";
import { mapWahamsterContactToLead, mapWahamsterMessageToLead } from "./whatsapp.mapper";
import { whatsappRepository } from "./whatsapp.repository";
import { whatsappHistoryImportQueue, WHATSAPP_HISTORY_IMPORT_JOB_ID } from "../../../jobs/queues/whatsappHistoryImport.queue";

const WEBHOOK_EVENTS = ["message.received", "message.status"];
const CONTACTS_PAGE_SIZE = 100;
const MESSAGES_PAGE_SIZE = 100;

const IDLE_HISTORY_IMPORT_PROGRESS: WhatsappHistoryImportProgress = {
  status: "IDLE",
  startedAt: null,
  finishedAt: null,
  contactsProcessed: 0,
  contactsSkipped: 0,
  leadsImported: 0,
  leadsUpdated: 0,
  messagesImported: 0,
  error: null,
};

async function getOrCreateChannel(): Promise<string> {
  const existing = await prisma.channel.findFirst({ where: { type: "WHATSAPP" } });
  if (existing) return existing.id;
  const created = await prisma.channel.create({ data: { type: "WHATSAPP", name: "WhatsApp Business" } });
  return created.id;
}

/** apiSecret is stored in refreshTokenEnc — a pragmatic reuse of the column shared by every
 *  platform's IntegrationConnection row (it's just "second encrypted secret", generically
 *  named for OAuth refresh tokens elsewhere) rather than adding a WhatsApp-only column to a
 *  table every other integration also uses. */
async function getCredentials(): Promise<WhatsappCredentials | null> {
  const connection = await prisma.integrationConnection.findUnique({ where: { channelType: "WHATSAPP" } });
  if (!connection?.accessTokenEnc || !connection.refreshTokenEnc || connection.status !== "CONNECTED") return null;
  return { apiKey: decryptSecret(connection.accessTokenEnc), apiSecret: decryptSecret(connection.refreshTokenEnc) };
}

async function getHistoryImportStatus(): Promise<WhatsappHistoryImportProgress> {
  const connection = await prisma.integrationConnection.findUnique({ where: { channelType: "WHATSAPP" } });
  const config = connection?.config as { historyImport?: WhatsappHistoryImportProgress } | null;
  return config?.historyImport ?? IDLE_HISTORY_IMPORT_PROGRESS;
}

/** Merges into the same config JSON blob connect()/ensureWebhookRegistered use (phoneNumber,
 *  webhookSecret) rather than clobbering it. */
async function persistHistoryImportProgress(progress: WhatsappHistoryImportProgress): Promise<void> {
  const connection = await prisma.integrationConnection.findUnique({ where: { channelType: "WHATSAPP" } });
  const existingConfig = (connection?.config as Record<string, unknown> | null) ?? {};
  await prisma.integrationConnection.update({
    where: { channelType: "WHATSAPP" },
    data: { config: { ...existingConfig, historyImport: progress } as unknown as Prisma.InputJsonValue },
  });
}

function toAccountInfo(account: WahamsterAccount): WhatsappAccountInfo {
  return {
    channelName: account.channel.name,
    phoneNumber: account.channel.phoneNumber,
    healthStatus: account.channel.healthStatus,
  };
}

async function verifyCredentials(credentials: WhatsappCredentials): Promise<WahamsterAccount> {
  try {
    return await whatsappService.getAccount(credentials);
  } catch (error) {
    const message = error instanceof WahamsterApiError ? error.message : "Could not verify these WaHamster credentials";
    throw AppError.badRequest(message);
  }
}

/** Checks GET /webhooks for one already pointed at this app; creates one via POST /webhooks
 *  if none exists. Reuses the previously-stored webhook secret on reconnect rather than
 *  minting a new one every time, since WaHamster likely doesn't return a webhook's secret on
 *  GET (only at creation) — losing it would silently break future signature checks. */
async function ensureWebhookRegistered(
  credentials: WhatsappCredentials,
  existingSecret: string | undefined,
): Promise<string | null> {
  const webhookUrl = `${env.API_URL}/public/webhooks/whatsapp`;

  const existingWebhooks = await whatsappService.listWebhooks(credentials).catch((error) => {
    logger.warn({ err: error }, "WaHamster listWebhooks failed during connect — attempting to create one anyway");
    return [];
  });

  if (existingWebhooks.some((hook) => hook.url === webhookUrl)) {
    if (!existingSecret) {
      logger.warn("A WaHamster webhook already points at this app, but no secret is on file — signature checks will be skipped for it");
    }
    return existingSecret ?? null;
  }

  const secret = crypto.randomBytes(24).toString("hex");
  await whatsappService.createWebhook(credentials, { url: webhookUrl, events: WEBHOOK_EVENTS, secret });
  return secret;
}

export const whatsappAdminService = {
  async connect(input: WhatsappConnectInput, userId: string): Promise<WhatsappAccountInfo> {
    const credentials = { apiKey: input.apiKey, apiSecret: input.apiSecret };
    const account = await verifyCredentials(credentials);
    const channelId = await getOrCreateChannel();

    const existing = await prisma.integrationConnection.findUnique({ where: { channelType: "WHATSAPP" } });
    const existingConfig = existing?.config as { webhookSecret?: string } | null;

    const webhookSecret = await ensureWebhookRegistered(credentials, existingConfig?.webhookSecret).catch((error) => {
      // Connection still succeeds — inbound messages just won't arrive until this is fixed
      // (e.g. API_URL isn't publicly reachable yet, same tradeoff Telegram's connect makes).
      logger.warn({ err: error }, "Failed to register WaHamster webhook during connect");
      return existingConfig?.webhookSecret ?? null;
    });

    await prisma.integrationConnection.upsert({
      where: { channelType: "WHATSAPP" },
      create: {
        channelType: "WHATSAPP",
        channelId,
        status: "CONNECTED",
        accessTokenEnc: encryptSecret(input.apiKey),
        refreshTokenEnc: encryptSecret(input.apiSecret),
        externalAccountId: account.channel.id,
        config: { phoneNumber: account.channel.phoneNumber, webhookSecret },
        connectedByUserId: userId,
        lastSyncedAt: new Date(),
      },
      update: {
        status: "CONNECTED",
        accessTokenEnc: encryptSecret(input.apiKey),
        refreshTokenEnc: encryptSecret(input.apiSecret),
        externalAccountId: account.channel.id,
        config: { phoneNumber: account.channel.phoneNumber, webhookSecret },
        connectedByUserId: userId,
        lastError: null,
        lastSyncedAt: new Date(),
      },
    });

    return toAccountInfo(account);
  },

  /** Verifies credentials against GET /account without persisting anything — backs the
   *  Settings UI's standalone "Test Connection" button. */
  async testConnection(input: WhatsappConnectInput): Promise<WhatsappAccountInfo> {
    const account = await verifyCredentials({ apiKey: input.apiKey, apiSecret: input.apiSecret });
    return toAccountInfo(account);
  },

  async disconnect(): Promise<void> {
    await prisma.integrationConnection
      .update({
        where: { channelType: "WHATSAPP" },
        data: { status: "DISCONNECTED", accessTokenEnc: null, refreshTokenEnc: null },
      })
      .catch(() => undefined);
  },

  async resync(): Promise<{ ok: boolean; error?: string }> {
    const credentials = await getCredentials();
    if (!credentials) return { ok: false, error: "Not connected" };

    try {
      await whatsappService.getAccount(credentials);
      await prisma.integrationConnection.update({
        where: { channelType: "WHATSAPP" },
        data: { lastSyncedAt: new Date(), lastError: null, status: "CONNECTED" },
      });
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await prisma.integrationConnection.update({ where: { channelType: "WHATSAPP" }, data: { status: "ERROR", lastError: message } });
      return { ok: false, error: message };
    }
  },

  /** Pulls every WaHamster contact and runs each through the normal lead-ingestion pipeline
   *  — dedup by phone (and by external identity on repeat syncs) is handled there, so this
   *  is safe to run repeatedly without creating duplicate leads. */
  async syncContacts(): Promise<WhatsappSyncContactsResult> {
    const credentials = await getCredentials();
    if (!credentials) throw AppError.badRequest("WhatsApp is not connected");

    let offset = 0;
    let imported = 0;
    let updated = 0;
    let skipped = 0;

    for (;;) {
      const page = await whatsappService.listContacts(credentials, { limit: CONTACTS_PAGE_SIZE, offset });
      if (page.contacts.length === 0) break;

      for (const contact of page.contacts) {
        const normalized = mapWahamsterContactToLead(contact);
        if (!normalized) {
          skipped++;
          continue;
        }
        const { created } = await leadIngestionService.ingest(normalized);
        if (created) imported++;
        else updated++;
      }

      offset += page.contacts.length;
      if (offset >= page.total) break;
    }

    await prisma.integrationConnection.update({ where: { channelType: "WHATSAPP" }, data: { lastSyncedAt: new Date() } });
    return { imported, updated, skipped };
  },

  /** Pulls this lead's WhatsApp message history and threads it into the lead timeline —
   *  useful for backfilling a conversation that predates connecting WhatsApp to this CRM. */
  async syncConversation(leadId: string): Promise<WhatsappSyncConversationResult> {
    const credentials = await getCredentials();
    if (!credentials) throw AppError.badRequest("WhatsApp is not connected");

    const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { phone: true } });
    if (!lead?.phone) throw AppError.badRequest("This lead has no phone number to sync");

    const digits = normalizeWahamsterPhone(lead.phone);
    const page = await whatsappService.getMessages(credentials, digits, { limit: 100 });

    let synced = 0;
    for (const message of page.messages) {
      const normalized = mapWahamsterMessageToLead(digits, message);
      if (!normalized) continue;
      await leadIngestionService.ingest(normalized);
      synced++;
    }

    return { synced };
  },

  /** Enqueues the bulk history import as a background job rather than running it inline —
   *  it fans out to every contact's full message history, which can run far longer than
   *  Sync Contacts. Doing that synchronously in an HTTP request risks the same failure mode
   *  diagnosed for the Sync Contacts logout incident: a long-held request outrunning the
   *  15-minute access token. Checking status here (not just inside importHistory()) gives
   *  the caller an immediate, clear error instead of a silently-ignored duplicate enqueue. */
  async startHistoryImport(): Promise<void> {
    const credentials = await getCredentials();
    if (!credentials) throw AppError.badRequest("WhatsApp is not connected");

    const status = await getHistoryImportStatus();
    if (status.status === "RUNNING") throw AppError.badRequest("A WhatsApp history import is already running");

    // A completed/failed job from a previous attempt still occupies this fixed jobId in
    // Redis — BullMQ no-ops add() while it's there, so every retry after the first failure
    // would silently do nothing. Clear it first so this attempt actually runs.
    const existingJob = await whatsappHistoryImportQueue.getJob(WHATSAPP_HISTORY_IMPORT_JOB_ID);
    if (existingJob) await existingJob.remove();

    await whatsappHistoryImportQueue.add("import", {}, { jobId: WHATSAPP_HISTORY_IMPORT_JOB_ID });
  },

  getHistoryImportStatus,

  /** The actual bulk import — runs inside the whatsapp-history-import worker, not an HTTP
   *  request. For every contact: creates/updates its lead (same as syncContacts), then pages
   *  through its full message history and writes each message with direction/status/id
   *  preserved via whatsappRepository.upsertHistoricalMessage. A single contact's message
   *  fetch failing is logged and skipped (counted in contactsSkipped) rather than aborting
   *  the run. Also safe to re-run after a full failure — lead and message dedup are both
   *  enforced by DB unique constraints. */
  async importHistory(): Promise<void> {
    const credentials = await getCredentials();
    if (!credentials) throw AppError.badRequest("WhatsApp is not connected");

    const currentStatus = await getHistoryImportStatus();
    if (currentStatus.status === "RUNNING") throw AppError.badRequest("A WhatsApp history import is already running");

    const channelId = await getOrCreateChannel();

    let progress: WhatsappHistoryImportProgress = {
      ...IDLE_HISTORY_IMPORT_PROGRESS,
      status: "RUNNING",
      startedAt: new Date().toISOString(),
    };
    await persistHistoryImportProgress(progress);

    try {
      let contactOffset = 0;
      for (;;) {
        const contactsPage = await whatsappService.listContacts(credentials, { limit: CONTACTS_PAGE_SIZE, offset: contactOffset });
        if (contactsPage.contacts.length === 0) break;

        for (const contact of contactsPage.contacts) {
          const normalizedContact = mapWahamsterContactToLead(contact);
          if (normalizedContact) {
            const { lead, created } = await leadIngestionService.ingest(normalizedContact);
            if (created) progress.leadsImported++;
            else progress.leadsUpdated++;

            const digits = normalizeWahamsterPhone(contact.phone);
            if (digits) {
              // One contact's message history failing (e.g. a 404 for a chat that no longer
              // exists on the WhatsApp side) shouldn't abort the entire import — log and
              // move on to the next contact instead, consistent with this function's own
              // "safe to re-run after a partial failure" contract.
              try {
                let latestMessageAt: Date | null = null;
                let messageOffset = 0;
                for (;;) {
                  const messagesPage = await whatsappService.getMessages(credentials, digits, {
                    limit: MESSAGES_PAGE_SIZE,
                    offset: messageOffset,
                  });
                  if (messagesPage.messages.length === 0) break;

                  for (const message of messagesPage.messages) {
                    const occurredAt = await whatsappRepository.upsertHistoricalMessage({
                      channelId,
                      leadId: lead.id,
                      phoneDigits: digits,
                      message,
                    });
                    progress.messagesImported++;
                    if (!latestMessageAt || occurredAt > latestMessageAt) latestMessageAt = occurredAt;
                  }

                  messageOffset += messagesPage.messages.length;
                  const hasMore =
                    messagesPage.total !== undefined
                      ? messageOffset < messagesPage.total
                      : messagesPage.messages.length === MESSAGES_PAGE_SIZE;
                  if (!hasMore) break;
                }

                if (latestMessageAt) {
                  await whatsappRepository.touchConversationLastMessageAt(channelId, digits, latestMessageAt);
                }
              } catch (error) {
                progress.contactsSkipped++;
                logger.warn(
                  { leadId: lead.id, digits, err: error },
                  "WhatsApp history import: skipping contact after message fetch failed",
                );
              }
            }
          }

          progress.contactsProcessed++;
          if (progress.contactsProcessed % 10 === 0) await persistHistoryImportProgress(progress);
        }

        contactOffset += contactsPage.contacts.length;
        if (contactOffset >= contactsPage.total) break;
      }

      progress = { ...progress, status: "COMPLETED", finishedAt: new Date().toISOString() };
      await persistHistoryImportProgress(progress);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      progress = { ...progress, status: "FAILED", finishedAt: new Date().toISOString(), error: message };
      await persistHistoryImportProgress(progress);
      throw error;
    }
  },

  /** Backs the WhatsApp Inbox page's conversation list — every Conversation on the WhatsApp
   *  channel that's linked to a lead, newest activity first. Message-thread detail is
   *  intentionally not duplicated here; the frontend reuses GET /leads/:id/timeline. */
  async listInbox(query: WhatsappInboxQuery): Promise<PaginatedResult<WhatsappInboxConversation>> {
    const channel = await prisma.channel.findFirst({ where: { type: "WHATSAPP" } });
    if (!channel) {
      return { items: [], page: query.page, pageSize: query.pageSize, total: 0, totalPages: 1 };
    }

    const where: Prisma.ConversationWhereInput = {
      channelId: channel.id,
      leadId: { not: null },
      ...(query.search
        ? {
            lead: {
              OR: [
                { firstName: { contains: query.search, mode: "insensitive" } },
                { lastName: { contains: query.search, mode: "insensitive" } },
                { phone: { contains: query.search, mode: "insensitive" } },
              ],
            },
          }
        : {}),
    };

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        include: {
          lead: { select: { id: true, firstName: true, lastName: true, phone: true } },
          messages: { orderBy: { createdAt: "desc" }, take: 1 },
        },
        orderBy: { lastMessageAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.conversation.count({ where }),
    ]);

    const items: WhatsappInboxConversation[] = conversations
      .filter((conversation) => conversation.lead)
      .map((conversation) => ({
        id: conversation.id,
        leadId: conversation.lead!.id,
        leadName: `${conversation.lead!.firstName} ${conversation.lead!.lastName}`.trim(),
        phone: conversation.lead!.phone,
        lastMessageBody: conversation.messages[0]?.body ?? null,
        lastMessageAt: conversation.lastMessageAt?.toISOString() ?? null,
        lastMessageSenderType: conversation.messages[0]?.senderType ?? null,
        unreadCount: conversation.unreadCount,
      }));

    return {
      items,
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    };
  },

  async sendReply(leadId: string, message: string, actorId: string): Promise<void> {
    const credentials = await getCredentials();
    if (!credentials) throw AppError.badRequest("WhatsApp is not connected");

    const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { phone: true } });
    if (!lead?.phone) throw AppError.badRequest("This lead has no phone number");

    const digits = normalizeWahamsterPhone(lead.phone);
    const sent = await whatsappService.sendReply(credentials, { phone: digits, message }).catch((error) => {
      const errorMessage = error instanceof WahamsterApiError ? error.message : "Failed to send WhatsApp message";
      throw AppError.badRequest(errorMessage);
    });

    await whatsappRepository.recordOutboundReply({
      leadId,
      phoneDigits: digits,
      body: message,
      externalMessageId: sent.whatsappMessageId ?? sent.id,
      senderId: actorId,
    });
  },

  getCredentials,
};
