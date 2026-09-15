import nodemailer from "nodemailer";
import MailComposer from "nodemailer/lib/mail-composer";

/** Sends mail as one of the mailbox's 8 addresses. The Hostinger Mail REST API's Send
 *  endpoint has no `from` field (confirmed against the official OpenAPI spec — it always
 *  sends as the mailbox's own address), so alias-based sending goes over SMTP instead,
 *  authenticated as the mailbox and setting the From header to the chosen alias. This
 *  mirrors what Hostinger's own docs describe for webmail ("send and receive as the
 *  alias") — aliases share the mailbox, so the SMTP server accepts any of them as From for
 *  a client authenticated as that mailbox. Host/port per docs.hostinger.com/emails/setup-devices.
 *
 *  Confirmed empirically against the live mailbox: unlike the REST Send endpoint (which
 *  documents auto-saving a copy to INBOX.Sent), plain SMTP submission does NOT get copied
 *  to Sent by Hostinger. The message is composed once here (via MailComposer, not
 *  transport.sendMail's own internal composition) precisely so the exact same raw RFC822
 *  bytes — same Message-Id and all — can be handed to hostingerMail.imap.ts for an IMAP
 *  APPEND into INBOX.Sent right after this send succeeds, rather than risking a
 *  second, independently-composed copy drifting from what was actually sent. */

const SMTP_HOST = "smtp.hostinger.com";
const SMTP_PORT = 465;

export interface SmtpCredentials {
  mailboxAddress: string;
  smtpPassword: string;
}

export interface SendMailParams {
  from: string;
  fromName?: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  /** Plain text only — the compose/reply UI is a plain textarea (see MailComposeModal),
   *  sent as-is rather than wrapped in HTML to avoid interpreting anything in it as markup. */
  body: string;
  /** RFC822 Message-Id of the message being replied to — sets In-Reply-To/References so
   *  the thread stays linked in mail clients that support it. */
  inReplyToMessageId?: string;
}

export interface SentMailResult {
  /** RFC822 Message-Id of the message we just sent — stored as
   *  EmailMessageDetail.hostingerMessageId for dedup/threading, same as inbound messages. */
  messageId: string;
  /** The exact raw RFC822 bytes handed to the SMTP server — reused for the IMAP APPEND to
   *  Sent so both copies are byte-identical. */
  raw: Buffer;
}

function buildTransport(credentials: SmtpCredentials) {
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: true,
    auth: { user: credentials.mailboxAddress, pass: credentials.smtpPassword },
  });
}

export const hostingerMailSmtp = {
  async send(credentials: SmtpCredentials, params: SendMailParams): Promise<SentMailResult> {
    const mailOptions = {
      from: params.fromName ? { name: params.fromName, address: params.from } : params.from,
      to: params.to,
      cc: params.cc,
      bcc: params.bcc,
      subject: params.subject,
      text: params.body,
      inReplyTo: params.inReplyToMessageId,
      references: params.inReplyToMessageId,
    };

    // Composing once via MailComposer (rather than letting transport.sendMail compose
    // internally) so we can capture the exact Message-Id and raw bytes it generates before
    // sending — transport.sendMail's own `info.messageId` is equivalent, but only MailComposer
    // exposes the raw source needed for the IMAP APPEND.
    const rootNode = new MailComposer(mailOptions).compile();
    const messageId = rootNode.messageId();
    const raw = await rootNode.build();

    const transport = buildTransport(credentials);
    // Structured to/cc/bcc/from are still passed alongside `raw` so nodemailer derives the
    // SMTP envelope (MAIL FROM / RCPT TO) from them as usual — `raw` only overrides the
    // message content nodemailer would otherwise compose, not the envelope.
    await transport.sendMail({ ...mailOptions, raw });

    return { messageId, raw };
  },
};
