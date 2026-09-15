import { logger } from "../../../config/logger";
import type { NormalizedInboundAttachment, NormalizedInboundLead } from "../../lead-ingestion/types";
import { instagramService, type InstagramMessagingEvent } from "./instagram.service";

function guessMimeType(attachmentType: string): string {
  switch (attachmentType) {
    case "image":
      return "image/jpeg";
    case "video":
      return "video/mp4";
    case "audio":
      return "audio/mpeg";
    default:
      return "application/octet-stream";
  }
}

/** Ignores echoes of our own outbound replies (is_echo) — those aren't inbound inquiries. */
export async function mapInstagramMessagingEvent(
  event: InstagramMessagingEvent,
  accessToken: string,
): Promise<NormalizedInboundLead | null> {
  if (!event.message || event.message.is_echo) return null;

  // Profile enrichment (name/username) is best-effort — the Instagram Messaging webhook
  // itself carries no sender profile info, only the IGSID.
  const profile = await instagramService.getProfile(event.sender.id, accessToken).catch((error) => {
    logger.warn({ err: error, igsid: event.sender.id }, "Failed to enrich Instagram sender profile, continuing without it");
    return null;
  });

  const attachments: NormalizedInboundAttachment[] = (event.message.attachments ?? [])
    .filter((a) => a.payload?.url)
    .map((a) => ({
      sourceUrl: a.payload.url!,
      fileName: `${a.type}-${event.message!.mid}`,
      mimeType: guessMimeType(a.type),
    }));

  return {
    source: "INSTAGRAM",
    externalUserId: event.sender.id,
    // Instagram Messaging 1:1 threads have no separate thread id — the sender's IGSID IS
    // the conversation identity.
    externalConversationId: event.sender.id,
    externalMessageId: event.message.mid,
    firstName: profile?.name,
    username: profile?.username,
    profileUrl: profile?.username ? `https://instagram.com/${profile.username}` : undefined,
    message: event.message.text,
    occurredAt: new Date(event.timestamp),
    attachments: attachments.length ? attachments : undefined,
    raw: event,
  };
}
