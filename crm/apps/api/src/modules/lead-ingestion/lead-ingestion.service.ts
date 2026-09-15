import { logger } from "../../config/logger";
import { getSystemUserId } from "../../lib/systemUser";
import { uploadObject } from "../../lib/s3Client";
import { io } from "../../sockets";
import { leadsService } from "../leads/leads.service";
import { channelTypeForSource, leadIngestionRepository, prisma, type Db } from "./lead-ingestion.repository";
import type { IngestResult, NormalizedInboundAttachment, NormalizedInboundLead } from "./types";

interface UploadedAttachment {
  fileName: string;
  fileKey: string;
  fileUrl: string;
  mimeType: string;
  size: number;
}

/** Downloads (if needed) and uploads every attachment to object storage. Runs OUTSIDE the
 *  DB transaction — this is slow network I/O and must not hold a transaction open. */
async function uploadAttachments(attachments: NormalizedInboundAttachment[] | undefined): Promise<UploadedAttachment[]> {
  if (!attachments?.length) return [];

  const results: UploadedAttachment[] = [];
  for (const attachment of attachments) {
    let buffer = attachment.buffer;

    if (!buffer && attachment.sourceUrl) {
      try {
        const response = await fetch(attachment.sourceUrl);
        if (!response.ok) throw new Error(`status ${response.status}`);
        buffer = Buffer.from(await response.arrayBuffer());
      } catch (error) {
        logger.warn({ sourceUrl: attachment.sourceUrl, err: error }, "Failed to download inbound attachment, skipping it");
        continue;
      }
    }
    if (!buffer) continue;

    const uploaded = await uploadObject({
      buffer,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      prefix: "lead-attachments",
    });

    results.push({
      fileName: attachment.fileName,
      fileKey: uploaded.fileKey,
      fileUrl: uploaded.fileUrl,
      mimeType: attachment.mimeType,
      size: attachment.size ?? buffer.length,
    });
  }
  return results;
}

/** Dedup order: (1) exact external-identity match on this channel, (2) email/phone match
 *  against any existing Lead regardless of source, (3) create a new Lead. */
async function resolveLead(db: Db, input: NormalizedInboundLead): Promise<{ leadId: string; created: boolean }> {
  const channelType = channelTypeForSource(input.source);

  if (input.externalUserId && channelType) {
    const existingId = await leadIngestionRepository.findLeadIdByExternalIdentity(db, channelType, input.externalUserId);
    if (existingId) return { leadId: existingId, created: false };
  }

  const existingByContact = await leadIngestionRepository.findLeadIdByEmailOrPhone(db, input.email, input.phone);
  if (existingByContact) return { leadId: existingByContact, created: false };

  const sourceId = await leadIngestionRepository.resolveLeadSourceId(db, input.source);
  if (!sourceId) {
    logger.warn({ source: input.source }, "No LeadSource row seeded for this source — run `pnpm db:seed`");
  }

  const lead = await leadIngestionRepository.createLead(db, {
    firstName: input.firstName?.trim() || input.username?.trim() || "Unknown",
    lastName: input.lastName?.trim() ?? "",
    email: input.email,
    phone: input.phone,
    company: input.company,
    description: input.message?.slice(0, 2000),
    sourceId,
  });

  return { leadId: lead.id, created: true };
}

/** Resolves/creates the Conversation + upserts the inbound Message for messaging sources.
 *  No-op for WEBSITE and LinkedIn CSV rows (no externalConversationId, no ongoing thread).
 *  `hasNewMessage` is false for a redelivered/duplicate message or a contacts-only sync with
 *  no message content — i.e. no real new activity happened. */
async function linkConversation(
  db: Db,
  leadId: string,
  input: NormalizedInboundLead,
): Promise<{ conversationId: string | undefined; hasNewMessage: boolean }> {
  const channelType = channelTypeForSource(input.source);
  if (!channelType || !input.externalConversationId) return { conversationId: undefined, hasNewMessage: false };

  const channelId = await leadIngestionRepository.resolveChannelId(db, channelType);
  if (!channelId) {
    logger.warn({ source: input.source }, "Integration not connected (no Channel) — skipping conversation linkage");
    return { conversationId: undefined, hasNewMessage: false };
  }

  const conversation = await leadIngestionRepository.upsertConversation(db, {
    channelId,
    leadId,
    externalConversationId: input.externalConversationId,
    occurredAt: input.occurredAt,
  });

  let hasNewMessage = false;
  if (input.message) {
    const result = await leadIngestionRepository.upsertMessage(db, {
      conversationId: conversation.id,
      externalMessageId: input.externalMessageId,
      body: input.message,
      occurredAt: input.occurredAt,
    });
    hasNewMessage = result.isNew;
  }

  return { conversationId: conversation.id, hasNewMessage };
}

export const leadIngestionService = {
  /**
   * The single entry point every source adapter (website/telegram/whatsapp/instagram/
   * linkedin) calls. Safe to call concurrently/redundantly — dedup and idempotency are
   * enforced by DB unique constraints (LeadExternalIdentity, Conversation, Message), so
   * at-least-once webhook redelivery never creates duplicates.
   */
  async ingest(input: NormalizedInboundLead): Promise<IngestResult> {
    const uploadedAttachments = await uploadAttachments(input.attachments);
    const uploadedById = uploadedAttachments.length > 0 ? await getSystemUserId() : undefined;

    const { leadId, created, conversationId } = await prisma.$transaction(async (tx) => {
      const { leadId, created } = await resolveLead(tx, input);

      const fieldsPatched = await leadIngestionRepository.patchLeadNullFieldsOnly(tx, leadId, {
        email: input.email,
        phone: input.phone,
        company: input.company,
      });

      const channelType = channelTypeForSource(input.source);
      let identityIsNew = false;
      if (input.externalUserId && channelType) {
        const result = await leadIngestionRepository.upsertExternalIdentity(tx, {
          leadId,
          channelType,
          externalUserId: input.externalUserId,
          username: input.username,
          profileUrl: input.profileUrl,
          lastMessageAt: input.occurredAt,
        });
        identityIsNew = result.isNew;
      }

      const { conversationId, hasNewMessage } = await linkConversation(tx, leadId, input);

      for (const attachment of uploadedAttachments) {
        await leadIngestionRepository.createAttachment(tx, {
          leadId,
          conversationId,
          fileName: attachment.fileName,
          fileKey: attachment.fileKey,
          fileUrl: attachment.fileUrl,
          mimeType: attachment.mimeType,
          size: attachment.size,
          uploadedById: uploadedById!,
        });
      }

      // Only log activity for a real change — a routine backfill re-sync that finds nothing
      // new about an already-known contact (e.g. the hourly WhatsApp contacts sync) must not
      // spam every existing lead's timeline and make it look "contacted today".
      const hasRealChange = created || fieldsPatched || identityIsNew || hasNewMessage || uploadedAttachments.length > 0;
      if (hasRealChange) {
        await leadIngestionRepository.createActivity(tx, {
          leadId,
          type: created ? "lead.ingested" : "lead.updated",
          description: created
            ? `New lead captured from ${input.source}`
            : `New activity from ${input.source}`,
          metadata: {
            source: input.source,
            externalUserId: input.externalUserId ?? null,
            externalConversationId: input.externalConversationId ?? null,
            raw: input.raw ? JSON.parse(JSON.stringify(input.raw)) : null,
          },
        });
      }

      return { leadId, created, conversationId };
    });

    const lead = await leadsService.getById(leadId);
    if (created) io?.emit("lead:created", { leadId });
    return { lead, created, conversationId };
  },
};
