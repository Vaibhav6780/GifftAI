import { ImapFlow } from "imapflow";
import { logger } from "../../../config/logger";
import { SENT_FOLDER } from "./hostingerMail.client";
import type { SmtpCredentials } from "./hostingerMail.smtp";

/** Saves a copy of a sent message into INBOX.Sent over raw IMAP — not part of Hostinger's
 *  Mail API or its official SDK, which has no create/append-message endpoint for any
 *  folder (confirmed by scanning the full OpenAPI spec). Confirmed empirically that plain
 *  SMTP submission isn't auto-copied to Sent by Hostinger, unlike its REST Send endpoint.
 *  IMAP APPEND (RFC 3501) is the standard mechanism every desktop mail client falls back to
 *  for exactly this case, and it's alias-agnostic — it just stores whatever raw message
 *  bytes it's given, with no concept of who the SMTP envelope sender was. Uses the same
 *  mailbox credentials as SMTP (docs.hostinger.com/emails/setup-devices lists one password
 *  shared across IMAP/SMTP/POP3 for a mailbox). Host/port per that same page. */

const IMAP_HOST = "imap.hostinger.com";
const IMAP_PORT = 993;

export const hostingerMailImap = {
  /** Best-effort — called right after a successful SMTP send. A failure here must never
   *  fail the send itself (the message already went out); it just means Hostinger's own
   *  Sent folder (and therefore webmail/other IMAP clients) won't show this particular
   *  message, while the CRM's own DB-backed Sent tab still will. */
  async appendToSent(credentials: SmtpCredentials, raw: Buffer): Promise<boolean> {
    const client = new ImapFlow({
      host: IMAP_HOST,
      port: IMAP_PORT,
      secure: true,
      auth: { user: credentials.mailboxAddress, pass: credentials.smtpPassword },
      logger: false,
    });

    try {
      await client.connect();
      // \Seen — sent mail is conventionally shown as already-read in every mail client's
      // Sent folder, same convention Gmail/Outlook/webmail all follow.
      const result = await client.append(SENT_FOLDER, raw, ["\\Seen"]);
      return result !== false;
    } catch (error) {
      logger.warn({ err: error }, "Failed to IMAP APPEND sent message into INBOX.Sent — CRM's own Sent tab still has it");
      return false;
    } finally {
      await client.logout().catch(() => client.close());
    }
  },
};
