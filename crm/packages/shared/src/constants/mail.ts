/** The one Hostinger mailbox this CRM manages, plus its 7 aliases — fixed by hPanel
 *  configuration, not fetched from the Hostinger Mail API (which has no aliases/identities
 *  endpoint; see hostingerMail.client.ts). Used to populate the Compose "From" dropdown and
 *  to validate/attribute which address a message was sent as. */
export const MAILBOX_ADDRESS = "support@gifftai.com";

export const MAILBOX_ALIASES = [
  "admin@gifftai.com",
  "affiliate@gifftai.com",
  "info@gifftai.com",
  "insure@gifftai.com",
  "rm@gifftai.com",
  "stacking@gifftai.com",
  "voucher@gifftai.com",
] as const;

export const MAILBOX_ALL_ADDRESSES = [MAILBOX_ADDRESS, ...MAILBOX_ALIASES] as const;

export type MailboxAddress = (typeof MAILBOX_ALL_ADDRESSES)[number];
