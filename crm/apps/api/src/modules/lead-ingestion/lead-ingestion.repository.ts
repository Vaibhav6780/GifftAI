import type { ChannelType, Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "../../config/prisma";
import type { LeadIngestionSource } from "./types";

/** Any Prisma client usable inside prisma.$transaction() — the transaction client or the
 *  plain client (for the one-off Website path, which needs no transaction-spanning reads). */
export type Db = PrismaClient | Prisma.TransactionClient;

const LEAD_SOURCE_NAME: Record<LeadIngestionSource, string> = {
  WEBSITE: "Website",
  INSTAGRAM: "Instagram",
  WHATSAPP: "WhatsApp",
  LINKEDIN: "LinkedIn",
  TELEGRAM: "Telegram",
};

/** Messaging sources map 1:1 to a Prisma ChannelType; WEBSITE has no Channel/Conversation. */
const CHANNEL_TYPE_BY_SOURCE: Partial<Record<LeadIngestionSource, ChannelType>> = {
  TELEGRAM: "TELEGRAM",
  WHATSAPP: "WHATSAPP",
  INSTAGRAM: "INSTAGRAM",
  LINKEDIN: "LINKEDIN",
};

export function channelTypeForSource(source: LeadIngestionSource): ChannelType | undefined {
  return CHANNEL_TYPE_BY_SOURCE[source];
}

const leadSourceIdCache = new Map<LeadIngestionSource, string>();

export const leadIngestionRepository = {
  async resolveLeadSourceId(db: Db, source: LeadIngestionSource): Promise<string | null> {
    const cached = leadSourceIdCache.get(source);
    if (cached) return cached;

    const row = await db.leadSource.findUnique({ where: { name: LEAD_SOURCE_NAME[source] } });
    if (!row) return null;

    leadSourceIdCache.set(source, row.id);
    return row.id;
  },

  findLeadIdByExternalIdentity(db: Db, channelType: ChannelType, externalUserId: string): Promise<string | null> {
    return db.leadExternalIdentity
      .findUnique({ where: { channelType_externalUserId: { channelType, externalUserId } }, select: { leadId: true } })
      .then((row) => row?.leadId ?? null);
  },

  async findLeadIdByEmailOrPhone(db: Db, email?: string, phone?: string): Promise<string | null> {
    if (!email && !phone) return null;
    const row = await db.lead.findFirst({
      where: {
        OR: [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])],
      },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    return row?.id ?? null;
  },

  createLead(
    db: Db,
    data: {
      firstName: string;
      lastName: string;
      email?: string;
      phone?: string;
      company?: string;
      description?: string;
      sourceId: string | null;
    },
  ) {
    return db.lead.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        company: data.company,
        description: data.description,
        sourceId: data.sourceId,
      },
    });
  },

  /** Fills in currently-null contact fields only — an inbound message never overwrites
   *  data a human already entered (e.g. a rep-corrected phone number). Returns whether
   *  anything was actually patched, so callers can tell a real change from a no-op re-sync. */
  async patchLeadNullFieldsOnly(
    db: Db,
    leadId: string,
    patch: { email?: string; phone?: string; company?: string },
  ): Promise<boolean> {
    const existing = await db.lead.findUniqueOrThrow({
      where: { id: leadId },
      select: { email: true, phone: true, company: true },
    });

    const data: Prisma.LeadUpdateInput = {};
    if (!existing.email && patch.email) data.email = patch.email;
    if (!existing.phone && patch.phone) data.phone = patch.phone;
    if (!existing.company && patch.company) data.company = patch.company;

    if (Object.keys(data).length === 0) return false;
    await db.lead.update({ where: { id: leadId }, data });
    return true;
  },

  /** Upserts the channel identity link and reports whether it was newly created — linking a
   *  new channel to an existing lead is real activity, but bumping lastMessageAt on an
   *  already-linked identity during a routine backfill re-sync is not. */
  async upsertExternalIdentity(
    db: Db,
    params: {
      leadId: string;
      channelType: ChannelType;
      externalUserId: string;
      username?: string;
      profileUrl?: string;
      lastMessageAt: Date;
    },
  ): Promise<{ isNew: boolean }> {
    const existing = await db.leadExternalIdentity.findUnique({
      where: { channelType_externalUserId: { channelType: params.channelType, externalUserId: params.externalUserId } },
      select: { channelType: true },
    });

    await db.leadExternalIdentity.upsert({
      where: { channelType_externalUserId: { channelType: params.channelType, externalUserId: params.externalUserId } },
      create: {
        leadId: params.leadId,
        channelType: params.channelType,
        externalUserId: params.externalUserId,
        username: params.username,
        profileUrl: params.profileUrl,
        lastMessageAt: params.lastMessageAt,
      },
      update: {
        username: params.username,
        profileUrl: params.profileUrl,
        lastMessageAt: params.lastMessageAt,
      },
    });

    return { isNew: !existing };
  },

  async resolveChannelId(db: Db, channelType: ChannelType): Promise<string | null> {
    const connection = await db.integrationConnection.findUnique({
      where: { channelType },
      select: { channelId: true, status: true },
    });
    if (!connection || connection.status !== "CONNECTED") return null;
    return connection.channelId ?? null;
  },

  upsertConversation(
    db: Db,
    params: { channelId: string; leadId: string; externalConversationId: string; occurredAt: Date },
  ) {
    return db.conversation.upsert({
      where: { channelId_externalConversationId: { channelId: params.channelId, externalConversationId: params.externalConversationId } },
      create: {
        channelId: params.channelId,
        leadId: params.leadId,
        externalConversationId: params.externalConversationId,
        status: "OPEN",
        lastMessageAt: params.occurredAt,
        unreadCount: 1,
      },
      update: {
        leadId: params.leadId,
        lastMessageAt: params.occurredAt,
        unreadCount: { increment: 1 },
      },
    });
  },

  /** Upserts on (conversationId, externalId) so at-least-once webhook redelivery of the
   *  same platform message id never creates a duplicate Message row. Reports whether the
   *  message was newly inserted vs. a redelivery no-op, so callers can tell real activity
   *  from a duplicate. */
  async upsertMessage(
    db: Db,
    params: { conversationId: string; externalMessageId?: string; body: string; occurredAt: Date },
  ): Promise<{ message: { id: string }; isNew: boolean }> {
    if (!params.externalMessageId) {
      const message = await db.message.create({
        data: {
          conversationId: params.conversationId,
          senderType: "CONTACT",
          body: params.body,
          createdAt: params.occurredAt,
        },
      });
      return { message, isNew: true };
    }

    const existing = await db.message.findUnique({
      where: { conversationId_externalId: { conversationId: params.conversationId, externalId: params.externalMessageId } },
      select: { id: true },
    });

    const message = await db.message.upsert({
      where: { conversationId_externalId: { conversationId: params.conversationId, externalId: params.externalMessageId } },
      create: {
        conversationId: params.conversationId,
        senderType: "CONTACT",
        externalId: params.externalMessageId,
        body: params.body,
        createdAt: params.occurredAt,
      },
      update: {},
    });

    return { message, isNew: !existing };
  },

  createAttachment(
    db: Db,
    params: {
      leadId: string;
      conversationId?: string;
      messageId?: string;
      fileName: string;
      fileKey: string;
      fileUrl: string;
      mimeType: string;
      size: number;
      uploadedById: string;
    },
  ) {
    return db.attachment.create({
      data: {
        leadId: params.leadId,
        conversationId: params.conversationId,
        messageId: params.messageId,
        fileName: params.fileName,
        fileKey: params.fileKey,
        fileUrl: params.fileUrl,
        mimeType: params.mimeType,
        size: params.size,
        uploadedById: params.uploadedById,
      },
    });
  },

  createActivity(
    db: Db,
    params: { leadId: string; type: string; description: string; metadata?: Prisma.InputJsonValue },
  ) {
    return db.activity.create({
      data: {
        leadId: params.leadId,
        type: params.type,
        description: params.description,
        metadata: params.metadata,
      },
    });
  },
};

export { prisma };
