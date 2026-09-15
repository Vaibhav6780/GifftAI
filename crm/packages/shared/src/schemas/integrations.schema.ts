import { z } from "zod";
import { MAILBOX_ALL_ADDRESSES } from "../constants/mail.js";

export const integrationChannelTypeSchema = z.enum(["WEBSITE", "INSTAGRAM", "WHATSAPP", "LINKEDIN", "TELEGRAM", "EMAIL"]);
export type IntegrationChannelTypeInput = z.infer<typeof integrationChannelTypeSchema>;

/** Most website contact forms just ask for a full name — the website adapter splits this
 *  into Lead.firstName/lastName rather than asking visitors for two separate fields. */
export const websiteContactFormSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(200),
    email: z.string().email("Enter a valid email address").optional(),
    phone: z.string().max(30).optional(),
    company: z.string().max(150).optional(),
    message: z.string().max(5000).optional(),
  })
  .refine((data) => Boolean(data.email || data.phone), {
    message: "Provide an email or phone number",
    path: ["email"],
  });
export type WebsiteContactFormInput = z.infer<typeof websiteContactFormSchema>;

/** Public support-ticket submission from the website's support/contact-us form — distinct
 *  from websiteContactFormSchema above, which feeds the sales Lead pipeline instead. */
export const websiteSupportTicketSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().email("Enter a valid email address"),
  phone: z.string().max(30).optional(),
  subject: z.string().min(1, "Subject is required").max(200),
  message: z.string().min(1, "Message is required").max(5000),
});
export type WebsiteSupportTicketInput = z.infer<typeof websiteSupportTicketSchema>;

/** WaHamster (whatsapp.lotsofcode.in) — a hosted WhatsApp API, authenticated with a static
 *  API key/secret pair rather than Meta's System User access token. */
export const whatsappConnectSchema = z.object({
  apiKey: z.string().min(1, "API Key is required"),
  apiSecret: z.string().min(1, "API Secret is required"),
});
export type WhatsappConnectInput = z.infer<typeof whatsappConnectSchema>;

export const whatsappReplySchema = z.object({
  message: z.string().min(1, "Message cannot be empty").max(4096),
});
export type WhatsappReplyInput = z.infer<typeof whatsappReplySchema>;

export const telegramConnectSchema = z.object({
  botToken: z.string().min(1, "Bot token is required"),
});
export type TelegramConnectInput = z.infer<typeof telegramConnectSchema>;

export const whatsappInboxQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().max(200).optional(),
});
export type WhatsappInboxQuery = z.infer<typeof whatsappInboxQuerySchema>;

export const telegramInboxQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().max(200).optional(),
});
export type TelegramInboxQuery = z.infer<typeof telegramInboxQuerySchema>;

export const telegramReplySchema = z.object({
  message: z.string().min(1, "Message cannot be empty").max(4096),
});
export type TelegramReplyInput = z.infer<typeof telegramReplySchema>;

/** Hostinger Mail API token (Bearer, from hPanel Agentic Mail -> API access) plus the
 *  mailbox's SMTP password — the REST Send API has no `from`/alias field (verified against
 *  the official OpenAPI spec), so alias-based sending goes over SMTP instead, which needs
 *  its own credential. See hostingerMail.admin.service.ts. */
export const mailConnectSchema = z.object({
  apiToken: z.string().min(1, "API token is required"),
  smtpPassword: z.string().min(1, "SMTP password is required"),
});
export type MailConnectInput = z.infer<typeof mailConnectSchema>;

export const mailInboxQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().max(200).optional(),
});
export type MailInboxQuery = z.infer<typeof mailInboxQuerySchema>;

export const mailSentQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().max(200).optional(),
});
export type MailSentQuery = z.infer<typeof mailSentQuerySchema>;

const mailAddressSchema = z.string().email("Enter a valid email address");
const mailFromSchema = z.enum(MAILBOX_ALL_ADDRESSES, { errorMap: () => ({ message: "Choose a valid sending address" }) });

export const mailComposeSchema = z.object({
  from: mailFromSchema,
  to: z.array(mailAddressSchema).min(1, "At least one recipient is required").max(50),
  cc: z.array(mailAddressSchema).max(50).default([]),
  bcc: z.array(mailAddressSchema).max(50).default([]),
  subject: z.string().min(1, "Subject is required").max(998),
  body: z.string().min(1, "Message cannot be empty").max(200_000),
});
export type MailComposeInput = z.infer<typeof mailComposeSchema>;

export const mailReplySchema = z.object({
  from: mailFromSchema.optional(),
  body: z.string().min(1, "Message cannot be empty").max(200_000),
});
export type MailReplyInput = z.infer<typeof mailReplySchema>;
