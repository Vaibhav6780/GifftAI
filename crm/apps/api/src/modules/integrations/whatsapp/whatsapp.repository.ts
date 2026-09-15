import type { MessageDeliveryStatus, MessageSenderType } from "@prisma/client";
import { prisma } from "../../../config/prisma";
import type { WahamsterMessage } from "./whatsapp.service";

const STATUS_MAP: Record<string, MessageDeliveryStatus> = {
  sent: "SENT",
  delivered: "DELIVERED",
  read: "READ",
  failed: "FAILED",
};

async function getConnectedChannelId(): Promise<string | null> {
  const connection = await prisma.integrationConnection.findUnique({
    where: { channelType: "WHATSAPP" },
    select: { channelId: true, status: true },
  });
  if (!connection || connection.status !== "CONNECTED") return null;
  return connection.channelId ?? null;
}

export const whatsappRepository = {
  /** Applies a message.status webhook event. externalId isn't globally unique in the schema
   *  (only per-conversation), but WhatsApp message ids are unique in practice, so findFirst
   *  is safe here. Returns false if no matching message was found (e.g. status arrived for
   *  a message this CRM never recorded). */
  async updateMessageStatusByExternalId(externalMessageId: string, rawStatus: string): Promise<boolean> {
    const mapped = STATUS_MAP[rawStatus.toLowerCase()];
    if (!mapped) return false;

    const message = await prisma.message.findFirst({ where: { externalId: externalMessageId } });
    if (!message) return false;

    await prisma.message.update({
      where: { id: message.id },
      data: { deliveryStatus: mapped, ...(mapped === "READ" ? { isRead: true } : {}) },
    });
    return true;
  },

  /** Appends an agent-sent reply to the same Conversation an inbound message from this lead
   *  would land in — externalConversationId is the digits-only phone, matching
   *  leadIngestionRepository's convention so history threads together regardless of
   *  direction. */
  async recordOutboundReply(params: {
    leadId: string;
    phoneDigits: string;
    body: string;
    externalMessageId?: string;
    senderId: string;
  }): Promise<void> {
    const channelId = await getConnectedChannelId();
    if (!channelId) throw new Error("WhatsApp is not connected");

    const conversation = await prisma.conversation.upsert({
      where: { channelId_externalConversationId: { channelId, externalConversationId: params.phoneDigits } },
      create: {
        channelId,
        leadId: params.leadId,
        externalConversationId: params.phoneDigits,
        status: "OPEN",
        lastMessageAt: new Date(),
      },
      update: { leadId: params.leadId, lastMessageAt: new Date() },
    });

    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderType: "AGENT",
        senderId: params.senderId,
        externalId: params.externalMessageId,
        body: params.body,
        deliveryStatus: "SENT",
      },
    });
  },

  /** Upserts one GET /messages/{phone} row for the bulk "Import WhatsApp History" job.
   *  Unlike upsertConversation above (built for live inbound traffic, where each call is a
   *  genuinely new unread message), this never increments unreadCount — a historical
   *  backfill replaying hundreds of old messages shouldn't manufacture a huge unread badge.
   *  Preserves direction (senderType), status, and the external message id for dedup, per
   *  the caller's per-contact offset loop over a paginated message history. */
  async upsertHistoricalMessage(params: {
    channelId: string;
    leadId: string;
    phoneDigits: string;
    message: WahamsterMessage;
  }): Promise<Date> {
    const conversation = await prisma.conversation.upsert({
      where: { channelId_externalConversationId: { channelId: params.channelId, externalConversationId: params.phoneDigits } },
      create: {
        channelId: params.channelId,
        leadId: params.leadId,
        externalConversationId: params.phoneDigits,
        status: "OPEN",
      },
      update: { leadId: params.leadId },
    });

    const senderType: MessageSenderType = params.message.direction === "inbound" ? "CONTACT" : "AGENT";
    const mappedStatus = STATUS_MAP[params.message.status?.toLowerCase() ?? ""];
    const occurredAt = new Date(params.message.timestamp ?? params.message.createdAt);
    const externalId = params.message.whatsappMessageId ?? params.message.id;

    await prisma.message.upsert({
      where: { conversationId_externalId: { conversationId: conversation.id, externalId } },
      create: {
        conversationId: conversation.id,
        senderType,
        externalId,
        body: params.message.content ?? "[Media message]",
        deliveryStatus: mappedStatus,
        isRead: Boolean(params.message.readAt),
        createdAt: occurredAt,
      },
      update: {},
    });

    return occurredAt;
  },

  /** Called once per contact after its message history is imported — sets Conversation's
   *  lastMessageAt to the true latest message time without an update-per-message. */
  async touchConversationLastMessageAt(channelId: string, phoneDigits: string, latestMessageAt: Date): Promise<void> {
    const conversation = await prisma.conversation.findUnique({
      where: { channelId_externalConversationId: { channelId, externalConversationId: phoneDigits } },
    });
    if (!conversation) return;
    if (conversation.lastMessageAt && conversation.lastMessageAt >= latestMessageAt) return;
    await prisma.conversation.update({ where: { id: conversation.id }, data: { lastMessageAt: latestMessageAt } });
  },
};
