import { MAILBOX_ADDRESS, MAILBOX_ALL_ADDRESSES } from "@gifftai/shared";
import type { HostingerMessage } from "./hostingerMail.client";

type MessageAddress = { name: string; address: string };

function addressList(addresses: MessageAddress[] | undefined): string[] {
  return (addresses ?? []).map((a) => a.address);
}

/** Which of the 8 mailbox addresses (support@ or one of its 7 aliases) this message was
 *  addressed to — aliases share one physical inbox (confirmed via
 *  docs.hostinger.com/emails/forwarders-aliases: "everything lands in the primary inbox"),
 *  so this is the only way to tell which alias a given inbound email actually came in on.
 *  Falls back to the primary mailbox address if none of the 8 appear (e.g. the CRM's
 *  mailbox was bcc'd, or the message predates an alias being added). */
export function resolveMailboxAddress(message: HostingerMessage): string {
  const candidates = [...addressList(message.to), ...addressList(message.cc)].map((a) => a.toLowerCase());
  const match = MAILBOX_ALL_ADDRESSES.find((address) => candidates.includes(address));
  return match ?? MAILBOX_ADDRESS;
}

export function mapMessageAddresses(message: HostingerMessage) {
  return {
    fromAddress: message.from?.address ?? null,
    fromName: message.from?.name ?? null,
    toAddresses: addressList(message.to),
    ccAddresses: addressList(message.cc),
    bccAddresses: addressList(message.bcc),
  };
}

/** Best-effort HTML/plain-text -> single plain-text display body, same convention
 *  Message.body already uses for every other channel (one string, rendered pre-wrapped as
 *  plain text in the UI — see WhatsappInboxPage). Deliberately never stores/renders raw
 *  email HTML: it comes from external senders and dangerouslySetInnerHTML-ing untrusted
 *  HTML would be an XSS hole, so HTML is stripped down to text instead of preserved. */
export function toDisplayBody(text: string, html: string): string {
  if (text.trim()) return text.trim();
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
