import type { Prisma } from "@prisma/client";
import { prisma } from "../../../config/prisma";
import { mapMessageAddresses, resolveMailboxAddress, toDisplayBody } from "./hostingerMail.mapper";
import type { HostingerMessage } from "./hostingerMail.client";

async function getOrCreateChannel(): Promise<string> {
  const existing = await prisma.channel.findFirst({ where: { type: "EMAIL" } });
  if (existing) return existing.id;
  const created = await prisma.channel.create({ data: { type: "EMAIL", name: "Hostinger Mail" } });
  return created.id;
}

/** Case-insensitive match against Contact.email first, then Lead.email — a Contact is a
 *  qualified/converted record so it takes priority when an address matches both. Returns
 *  null/null (an unlinked conversation, still visible in the general Inbox) when neither
 *  matches — most support@/info@ traffic isn't from an existing lead. */
async function matchParticipant(email: string | null): Promise<{ leadId: string | null; contactId: string | null }> {
  if (!email) return { leadId: null, contactId: null };

  const contact = await prisma.contact.findFirst({ where: { email: { equals: email, mode: "insensitive" } }, select: { id: true } });
  if (contact) return { leadId: null, contactId: contact.id };

  const lead = await prisma.lead.findFirst({ where: { email: { equals: email, mode: "insensitive" } }, select: { id: true } });
  if (lead) return { leadId: lead.id, contactId: null };

  return { leadId: null, contactId: null };
}

/** Resolves which Conversation an inbound message belongs to: if it's a reply to a message
 *  this CRM already recorded (inReplyTo matches a stored hostingerMessageId), reuse that
 *  message's Conversation so the thread stays together; otherwise it's the root of a new
 *  thread, keyed by its own hostingerMessageId (falls back to `folder:uid` for the rare
 *  message with no Message-Id header — required by RFC 5322 but not universally sent). */
async function resolveConversationId(params: {
  channelId: string;
  threadKey: string;
  inReplyToMessageId: string | null;
  leadId: string | null;
  contactId: string | null;
  subject: string | null;
  occurredAt: Date;
}): Promise<string> {
  if (params.inReplyToMessageId) {
    const parent = await prisma.emailMessageDetail.findUnique({
      where: { hostingerMessageId: params.inReplyToMessageId },
      select: { message: { select: { conversationId: true } } },
    });
    if (parent) {
      const conversation = await prisma.conversation.update({
        where: { id: parent.message.conversationId },
        data: {
          lastMessageAt: params.occurredAt,
          unreadCount: { increment: 1 },
          ...(params.leadId ? { leadId: params.leadId } : {}),
          ...(params.contactId ? { contactId: params.contactId } : {}),
        },
      });
      return conversation.id;
    }
  }

  const conversation = await prisma.conversation.upsert({
    where: { channelId_externalConversationId: { channelId: params.channelId, externalConversationId: params.threadKey } },
    create: {
      channelId: params.channelId,
      externalConversationId: params.threadKey,
      subject: params.subject,
      leadId: params.leadId,
      contactId: params.contactId,
      status: "OPEN",
      lastMessageAt: params.occurredAt,
      unreadCount: 1,
    },
    update: {
      lastMessageAt: params.occurredAt,
      unreadCount: { increment: 1 },
      ...(params.leadId ? { leadId: params.leadId } : {}),
      ...(params.contactId ? { contactId: params.contactId } : {}),
    },
  });
  return conversation.id;
}

export const hostingerMailRepository = {
  async getConnection() {
    return prisma.integrationConnection.findUnique({ where: { channelType: "EMAIL" } });
  },

  /** Cheap existence check ahead of the expensive (and Seen-marking — see
   *  hostingerMail.client.ts#getMessageText) body fetch. Confirmed empirically: our own
   *  outbound sends (compose/reply) are recorded locally with the SMTP-assigned Message-Id
   *  at send time, so when that same mail is later read back from INBOX (e.g. a self-
   *  addressed alias test, or a case where an alias is also cc'd elsewhere), it already has
   *  a matching EmailMessageDetail row — fetching its body again would be wasted work and
   *  would needlessly mark it \Seen on Hostinger. */
  async isAlreadyIngested(hostingerMessageId: string): Promise<boolean> {
    const existing = await prisma.emailMessageDetail.findUnique({ where: { hostingerMessageId }, select: { messageId: true } });
    return Boolean(existing);
  },

  /** Idempotent — skips and returns null if this Hostinger message was already ingested
   *  (the actual "prevent duplicate webhook processing" guarantee: hostingerMessageId is
   *  globally unique on EmailMessageDetail, so a re-delivered/re-synced webhook trigger is
   *  a no-op here regardless of how many times message.received fires for the same mail). */
  async upsertInboundMessage(params: {
    folder: string;
    hostinger: HostingerMessage;
    bodyText: string;
    bodyHtml: string;
  }): Promise<{ messageId: string; conversationId: string } | null> {
    const hostingerMessageId = params.hostinger.messageId ?? `${params.folder}:${params.hostinger.uid}`;

    const existing = await prisma.emailMessageDetail.findUnique({ where: { hostingerMessageId }, select: { messageId: true } });
    if (existing) return null;

    const channelId = await getOrCreateChannel();
    const addresses = mapMessageAddresses(params.hostinger);
    const mailboxAddress = resolveMailboxAddress(params.hostinger);
    const occurredAt = new Date(params.hostinger.date);
    const { leadId, contactId } = await matchParticipant(addresses.fromAddress);

    const conversationId = await resolveConversationId({
      channelId,
      threadKey: hostingerMessageId,
      inReplyToMessageId: params.hostinger.inReplyTo,
      leadId,
      contactId,
      subject: params.hostinger.subject,
      occurredAt,
    });

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderType: "CONTACT",
        externalId: hostingerMessageId,
        body: toDisplayBody(params.bodyText, params.bodyHtml),
        isRead: false,
        createdAt: occurredAt,
        emailDetail: {
          create: {
            hostingerMessageId,
            hostingerFolder: params.folder,
            hostingerUid: params.hostinger.uid,
            mailboxAddress,
            fromAddress: addresses.fromAddress,
            fromName: addresses.fromName,
            toAddresses: addresses.toAddresses as unknown as Prisma.InputJsonValue,
            ccAddresses: addresses.ccAddresses as unknown as Prisma.InputJsonValue,
            bccAddresses: addresses.bccAddresses as unknown as Prisma.InputJsonValue,
            inReplyToMessageId: params.hostinger.inReplyTo,
            hasAttachments: params.hostinger.attachments.length > 0,
          },
        },
      },
    });

    return { messageId: message.id, conversationId };
  },

  /** Appends an agent-sent reply/compose to a Conversation, recording the SMTP-assigned
   *  Message-Id so a later reply-to-our-reply threads correctly (mirrors
   *  whatsapp.repository.ts's recordOutboundReply). */
  async recordOutboundMessage(params: {
    conversationId: string;
    senderId: string;
    body: string;
    hostingerMessageId: string;
    mailboxAddress: string;
    to: string[];
    cc: string[];
    inReplyToMessageId?: string | null;
  }): Promise<void> {
    await prisma.message.create({
      data: {
        conversationId: params.conversationId,
        senderType: "AGENT",
        senderId: params.senderId,
        externalId: params.hostingerMessageId,
        body: params.body,
        isRead: true,
        deliveryStatus: "SENT",
        emailDetail: {
          create: {
            hostingerMessageId: params.hostingerMessageId,
            hostingerFolder: "INBOX.Sent",
            hostingerUid: 0,
            mailboxAddress: params.mailboxAddress,
            fromAddress: params.mailboxAddress,
            toAddresses: params.to as unknown as Prisma.InputJsonValue,
            ccAddresses: params.cc as unknown as Prisma.InputJsonValue,
            inReplyToMessageId: params.inReplyToMessageId ?? null,
          },
        },
      },
    });

    await prisma.conversation.update({ where: { id: params.conversationId }, data: { lastMessageAt: new Date() } });
  },

  /** Starts (or reuses, if this recipient already has a thread) a Conversation for a
   *  brand-new Compose — not a reply to any existing inbound message. Threaded by
   *  recipient address rather than a Hostinger thread key, so a reply to this new email
   *  will later attach via resolveConversationId's inReplyTo lookup once it's SMTP-sent
   *  with a real Message-Id. */
  async findOrCreateConversationForRecipient(params: { toAddress: string; subject: string | null }): Promise<string> {
    const channelId = await getOrCreateChannel();
    const { leadId, contactId } = await matchParticipant(params.toAddress);
    const threadKey = `compose:${params.toAddress.toLowerCase()}`;

    const conversation = await prisma.conversation.upsert({
      where: { channelId_externalConversationId: { channelId, externalConversationId: threadKey } },
      create: {
        channelId,
        externalConversationId: threadKey,
        subject: params.subject,
        leadId,
        contactId,
        status: "OPEN",
        lastMessageAt: new Date(),
      },
      update: { lastMessageAt: new Date() },
    });
    return conversation.id;
  },

  async getLatestInboundMessage(conversationId: string) {
    return prisma.message.findFirst({
      where: { conversationId, senderType: "CONTACT" },
      orderBy: { createdAt: "desc" },
      include: { emailDetail: true },
    });
  },
};
