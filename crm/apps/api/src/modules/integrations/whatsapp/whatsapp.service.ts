import { wahamsterClient } from "./wahamster.client";

export type {
  WahamsterAccount,
  WahamsterContact,
  WahamsterContactsPage,
  WahamsterMessage,
  WahamsterMessagesPage,
  WahamsterWebhook,
} from "./wahamster.client";
export { WahamsterApiError } from "./wahamster.client";

export interface WhatsappCredentials {
  apiKey: string;
  apiSecret: string;
}

/** WaHamster phone numbers show up in two forms in the same API response — plain digits
 *  ("919172883429") and formatted ("+91 87968 07269"). Stripping to digits-only gives a
 *  stable key usable both as the external identity id and (with a leading "+") as
 *  Lead.phone, so the same contact never creates two leads. */
export function normalizeWahamsterPhone(raw: string): string {
  return raw.replace(/\D/g, "");
}

/** Thin re-export of the WaHamster client under the name the rest of the WhatsApp module
 *  already imports from — keeps whatsapp.mapper.ts / whatsapp.admin.service.ts / the
 *  webhook controller decoupled from the raw client module. */
export const whatsappService = {
  getAccount: wahamsterClient.getAccount,
  listWebhooks: wahamsterClient.listWebhooks,
  createWebhook: wahamsterClient.createWebhook,
  sendReply: wahamsterClient.sendReply,
  listContacts: wahamsterClient.listContacts,
  getMessages: wahamsterClient.getMessages,
};
