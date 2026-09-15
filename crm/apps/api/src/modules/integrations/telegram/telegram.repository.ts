import { prisma } from "../../../config/prisma";

export const telegramRepository = {
  /** Appends an agent-sent reply to the same Conversation an inbound message from this lead
   *  would land in — externalConversationId is the Telegram chat id, matching
   *  leadIngestionRepository's convention so history threads together regardless of
   *  direction. */
  async recordOutboundReply(params: {
    channelId: string;
    leadId: string;
    chatId: string;
    body: string;
    externalMessageId?: string;
    senderId: string;
  }): Promise<void> {
    const conversation = await prisma.conversation.upsert({
      where: { channelId_externalConversationId: { channelId: params.channelId, externalConversationId: params.chatId } },
      create: {
        channelId: params.channelId,
        leadId: params.leadId,
        externalConversationId: params.chatId,
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
};
