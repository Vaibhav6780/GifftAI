import type { LeadTimelineEntry } from "@gifftai/shared";
import { prisma } from "../../config/prisma";
import { AppError } from "../../lib/apiError";

/**
 * Merges Activity (audit/timeline entries written by lead-ingestion and manual actions),
 * Message (conversation history from messaging-source integrations), and Attachment into
 * one chronological feed — "preserve complete conversation history" from a single call
 * rather than the frontend stitching together separate endpoints. Notes have their own
 * dedicated section/endpoint (`GET /leads/:id/notes`) rather than being folded in here, so
 * they can support ownership-gated add/edit without complicating this read-only feed.
 */
export const leadsTimelineService = {
  async getTimeline(leadId: string): Promise<LeadTimelineEntry[]> {
    const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { id: true } });
    if (!lead) throw AppError.notFound("Lead not found");

    const [activities, conversations, attachments] = await Promise.all([
      prisma.activity.findMany({ where: { leadId } }),
      prisma.conversation.findMany({ where: { leadId }, include: { messages: true } }),
      prisma.attachment.findMany({ where: { leadId } }),
    ]);

    const entries: LeadTimelineEntry[] = [];

    for (const activity of activities) {
      entries.push({
        id: activity.id,
        kind: "activity",
        occurredAt: activity.createdAt.toISOString(),
        label: activity.type,
        body: activity.description,
        metadata: (activity.metadata as Record<string, unknown> | null) ?? null,
      });
    }

    for (const conversation of conversations) {
      for (const message of conversation.messages) {
        entries.push({
          id: message.id,
          kind: "message",
          occurredAt: message.createdAt.toISOString(),
          label: message.senderType,
          body: message.body,
          metadata: {
            conversationId: conversation.id,
            senderType: message.senderType,
            deliveryStatus: message.deliveryStatus,
            externalId: message.externalId,
          },
        });
      }
    }

    for (const attachment of attachments) {
      entries.push({
        id: attachment.id,
        kind: "attachment",
        occurredAt: attachment.createdAt.toISOString(),
        label: attachment.fileName,
        body: attachment.fileUrl,
        metadata: { mimeType: attachment.mimeType, size: attachment.size },
      });
    }

    entries.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
    return entries;
  },
};
