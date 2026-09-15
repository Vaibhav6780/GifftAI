import type { Job } from "bullmq";
import { logger } from "../../config/logger";
import { hostingerMailAdminService } from "../../modules/integrations/hostinger-mail/hostingerMail.admin.service";
import { hostingerMailRepository } from "../../modules/integrations/hostinger-mail/hostingerMail.repository";
import { hostingerMailClient, INBOX_FOLDER } from "../../modules/integrations/hostinger-mail/hostingerMail.client";
import type { HostingerMailInboundJobData } from "../queues/hostingerMailInbound.queue";

const PAGE_SIZE = 50;
// Caps how much a single trigger will fetch — comfortably more than any realistic burst
// between webhook deliveries, while bounding worst case if a delivery was missed for a
// while (self-healing resync, see hostingerMail.webhook.controller.ts's module comment).
const MAX_PAGES = 10;

/** Every `message.received` webhook delivery enqueues one of these. Since the webhook
 *  payload's shape is undocumented (see the webhook controller's comment), this doesn't
 *  read job.data at all — it just resyncs INBOX from the stored `lastSeenUid` cursor via
 *  the documented List Messages endpoint, which is also what makes duplicate/redundant
 *  webhook deliveries a safe no-op: hostingerMailRepository.upsertInboundMessage dedupes on
 *  the globally-unique hostingerMessageId regardless of how many times this runs. */
export async function hostingerMailInboundProcessor(_job: Job<HostingerMailInboundJobData>): Promise<void> {
  const credentials = await hostingerMailAdminService.getCredentials();
  const config = await hostingerMailAdminService.getConfig();
  if (!credentials || !config) return;

  const lastSeenUid = config.lastSeenUid;
  const newMessages: Awaited<ReturnType<typeof hostingerMailClient.listMessages>>["items"] = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    const { items } = await hostingerMailClient.listMessages(credentials, credentials.mailboxResourceId, INBOX_FOLDER, { page, perPage: PAGE_SIZE });
    if (items.length === 0) break;

    const fresh = items.filter((message) => message.uid > lastSeenUid);
    newMessages.push(...fresh);

    // Sorted -uid (newest first): once a page contains anything at or below the cursor,
    // every subsequent page is even older — stop paginating.
    if (fresh.length < items.length) break;
  }

  if (newMessages.length === 0) return;

  // Oldest-first, so threads and conversation ordering come out right.
  newMessages.reverse();

  // Advances the cursor only through the leading run of successes — stopping at the first
  // failure rather than the highest uid processed. Otherwise a mid-batch failure (e.g. one
  // getMessageText call errors) would let the cursor jump past it via a later success,
  // silently dropping that message forever since the next sync only looks at uid >
  // lastSeenUid. Re-processing already-ingested messages up to the failure point on retry
  // is harmless — upsertInboundMessage dedupes on hostingerMessageId.
  let highestUidSeen = lastSeenUid;
  for (const message of newMessages) {
    try {
      const hostingerMessageId = message.messageId ?? `${INBOX_FOLDER}:${message.uid}`;

      // Dedup BEFORE fetching the body — getMessageText marks \Seen on Hostinger as a
      // documented side effect (confirmed against the live API), so a message we already
      // have (e.g. our own outbound send read back via a self-addressed alias) shouldn't
      // pay that cost or have its Hostinger read-state touched for no reason.
      const alreadyIngested = await hostingerMailRepository.isAlreadyIngested(hostingerMessageId);
      if (!alreadyIngested) {
        const { text, html } = await hostingerMailClient.getMessageText(credentials, credentials.mailboxResourceId, INBOX_FOLDER, message.uid);
        await hostingerMailRepository.upsertInboundMessage({ folder: INBOX_FOLDER, hostinger: message, bodyText: text, bodyHtml: html });

        // getMessageText just marked this \Seen on Hostinger's side — restore it to unseen
        // so Hostinger/webmail agree with our own isRead:false until an agent actually marks
        // it read in the CRM (hostingerMailAdminService.markConversationRead pushes \Seen
        // back at that point). Uses restoreUnseen's verify-and-retry rather than a single
        // patch call — confirmed against the live API that a single call immediately after
        // getMessageText races Hostinger's own async \Seen-add and can silently lose.
        // Best-effort either way — a failure here shouldn't drop the message or fail the
        // sync, it just leaves Hostinger's own read state slightly stale.
        const restored = await hostingerMailClient
          .restoreUnseen(credentials, credentials.mailboxResourceId, INBOX_FOLDER, message.uid)
          .catch((error) => {
            logger.warn({ err: error, uid: message.uid }, "Failed to restore \\Seen state on Hostinger after ingesting");
            return false;
          });
        if (!restored) {
          logger.warn({ uid: message.uid }, "Could not confirm \\Seen was restored to unread on Hostinger after ingesting");
        }
      }

      highestUidSeen = message.uid;
    } catch (error) {
      logger.error({ err: error, uid: message.uid }, "Failed to ingest Hostinger Mail message — stopping this sync, will retry from here next time");
      break;
    }
  }

  if (highestUidSeen > lastSeenUid) {
    await hostingerMailAdminService.setLastSeenUid(highestUidSeen);
  }
}
