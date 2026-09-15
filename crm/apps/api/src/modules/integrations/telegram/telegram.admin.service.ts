import crypto from "node:crypto";
import type { Prisma } from "@prisma/client";
import type { PaginatedResult, TelegramConnectInput, TelegramInboxConversation, TelegramInboxQuery } from "@gifftai/shared";
import { prisma } from "../../../config/prisma";
import { env } from "../../../config/env";
import { logger } from "../../../config/logger";
import { AppError } from "../../../lib/apiError";
import { decryptSecret, encryptSecret } from "../../../lib/crypto";
import { telegramService } from "./telegram.service";
import { telegramRepository } from "./telegram.repository";

async function getOrCreateChannel(): Promise<string> {
  const existing = await prisma.channel.findFirst({ where: { type: "TELEGRAM" } });
  if (existing) return existing.id;
  const created = await prisma.channel.create({ data: { type: "TELEGRAM", name: "Telegram" } });
  return created.id;
}

async function registerWebhookIfNeeded(botToken: string, webhookSecret: string): Promise<void> {
  if (env.TELEGRAM_MODE !== "webhook") return;
  const webhookUrl = `${env.API_URL}/public/webhooks/telegram`;
  await telegramService.setWebhook(botToken, webhookUrl, webhookSecret);
}

async function getBotToken(): Promise<string | null> {
  const connection = await prisma.integrationConnection.findUnique({ where: { channelType: "TELEGRAM" } });
  if (!connection?.accessTokenEnc || connection.status !== "CONNECTED") return null;
  return decryptSecret(connection.accessTokenEnc);
}

export const telegramAdminService = {
  async connect(input: TelegramConnectInput, userId: string) {
    const me = await telegramService.getMe(input.botToken).catch((error) => {
      logger.warn({ err: error }, "Telegram getMe failed during connect");
      return null;
    });
    if (!me) throw AppError.badRequest("Invalid Telegram bot token — the Bot API rejected it");

    const channelId = await getOrCreateChannel();
    const webhookSecret = crypto.randomBytes(24).toString("hex");

    await registerWebhookIfNeeded(input.botToken, webhookSecret).catch((error) => {
      // Connection still succeeds — webhook mode requires a public URL the user may not
      // have configured yet (e.g. local dev without ngrok). set-webhook can retry later.
      logger.warn({ err: error }, "Telegram setWebhook failed during connect — retry via /set-webhook once a public URL is reachable");
    });

    await prisma.integrationConnection.upsert({
      where: { channelType: "TELEGRAM" },
      create: {
        channelType: "TELEGRAM",
        channelId,
        status: "CONNECTED",
        accessTokenEnc: encryptSecret(input.botToken),
        externalAccountId: me.username ?? String(me.id),
        config: { webhookSecret },
        connectedByUserId: userId,
        lastSyncedAt: new Date(),
      },
      update: {
        status: "CONNECTED",
        accessTokenEnc: encryptSecret(input.botToken),
        externalAccountId: me.username ?? String(me.id),
        config: { webhookSecret },
        connectedByUserId: userId,
        lastError: null,
        lastSyncedAt: new Date(),
      },
    });

    return { username: me.username, mode: env.TELEGRAM_MODE };
  },

  async disconnect(): Promise<void> {
    const botToken = await getBotToken();
    if (botToken) await telegramService.deleteWebhook(botToken).catch(() => undefined);

    await prisma.integrationConnection
      .update({ where: { channelType: "TELEGRAM" }, data: { status: "DISCONNECTED", accessTokenEnc: null } })
      .catch(() => undefined);
  },

  async resync(): Promise<{ ok: boolean; error?: string }> {
    const botToken = await getBotToken();
    if (!botToken) return { ok: false, error: "Not connected" };

    try {
      await telegramService.getMe(botToken);
      await prisma.integrationConnection.update({
        where: { channelType: "TELEGRAM" },
        data: { lastSyncedAt: new Date(), lastError: null, status: "CONNECTED" },
      });
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await prisma.integrationConnection.update({
        where: { channelType: "TELEGRAM" },
        data: { status: "ERROR", lastError: message },
      });
      return { ok: false, error: message };
    }
  },

  /** Re-registers the webhook URL — useful after the local dev tunnel URL changes,
   *  without re-entering the bot token. */
  async setWebhookNow(): Promise<void> {
    const connection = await prisma.integrationConnection.findUnique({ where: { channelType: "TELEGRAM" } });
    if (!connection?.accessTokenEnc) throw AppError.badRequest("Telegram is not connected");

    const config = connection.config as { webhookSecret?: string } | null;
    const webhookSecret = config?.webhookSecret;
    if (!webhookSecret) throw AppError.internal("Missing webhook secret — reconnect Telegram");

    await telegramService.setWebhook(decryptSecret(connection.accessTokenEnc), `${env.API_URL}/public/webhooks/telegram`, webhookSecret);
  },

  getBotToken,

  async getWebhookSecret(): Promise<string | null> {
    const connection = await prisma.integrationConnection.findUnique({ where: { channelType: "TELEGRAM" } });
    const config = connection?.config as { webhookSecret?: string } | null;
    return config?.webhookSecret ?? null;
  },

  /** Backs the Telegram Inbox page's conversation list — every Conversation on the Telegram
   *  channel that's linked to a lead, newest activity first. Message-thread detail is
   *  intentionally not duplicated here; the frontend reuses GET /leads/:id/timeline. Inbound
   *  messages already populate Conversation/Message via leadIngestionService.ingest, so this
   *  is read-only. */
  async listInbox(query: TelegramInboxQuery): Promise<PaginatedResult<TelegramInboxConversation>> {
    const channel = await prisma.channel.findFirst({ where: { type: "TELEGRAM" } });
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
              ],
            },
          }
        : {}),
    };

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        include: {
          lead: { select: { id: true, firstName: true, lastName: true } },
          messages: { orderBy: { createdAt: "desc" }, take: 1 },
        },
        orderBy: { lastMessageAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.conversation.count({ where }),
    ]);

    const leadIds = conversations.filter((c) => c.lead).map((c) => c.lead!.id);
    const identities = await prisma.leadExternalIdentity.findMany({
      where: { channelType: "TELEGRAM", leadId: { in: leadIds } },
      select: { leadId: true, username: true },
    });
    const usernameByLeadId = new Map(identities.map((i) => [i.leadId, i.username]));

    const items: TelegramInboxConversation[] = conversations
      .filter((conversation) => conversation.lead && conversation.externalConversationId)
      .map((conversation) => ({
        id: conversation.id,
        leadId: conversation.lead!.id,
        leadName: `${conversation.lead!.firstName} ${conversation.lead!.lastName}`.trim(),
        username: usernameByLeadId.get(conversation.lead!.id) ?? null,
        chatId: conversation.externalConversationId!,
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
    const botToken = await getBotToken();
    if (!botToken) throw AppError.badRequest("Telegram is not connected");

    const channel = await prisma.channel.findFirst({ where: { type: "TELEGRAM" } });
    if (!channel) throw AppError.badRequest("Telegram is not connected");

    const conversation = await prisma.conversation.findFirst({
      where: { channelId: channel.id, leadId },
      select: { externalConversationId: true },
    });
    if (!conversation?.externalConversationId) {
      throw AppError.badRequest("This lead has no Telegram conversation to reply to");
    }

    const sent = await telegramService.sendMessage(botToken, conversation.externalConversationId, message).catch((error) => {
      const errorMessage = error instanceof Error ? error.message : "Failed to send Telegram message";
      throw AppError.badRequest(errorMessage);
    });

    await telegramRepository.recordOutboundReply({
      channelId: channel.id,
      leadId,
      chatId: conversation.externalConversationId,
      body: message,
      externalMessageId: String(sent.message_id),
      senderId: actorId,
    });
  },
};
