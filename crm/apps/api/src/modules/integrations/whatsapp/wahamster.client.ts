import { env } from "../../../config/env";
import { httpRequestJson } from "../../../lib/httpClient";

/**
 * Thin client for WaHamster (whatsapp.lotsofcode.in) — a hosted WhatsApp API, replacing
 * Meta's Graph API for this integration. There's no public API documentation for it, so the
 * shapes below (except `WahamsterWebhook`/the POST /webhooks and POST /messages/reply request
 * bodies) were confirmed empirically against a real connected account: GET /account,
 * GET /webhooks, GET /contacts, and GET /messages/{phone} were all called live and their
 * exact response shapes captured. The two POST endpoints and the inbound webhook payload
 * itself are best-effort — see whatsapp.webhook.controller.ts, which logs every raw payload
 * so the real shape can be confirmed (and this file corrected) once live traffic arrives.
 */

interface WahamsterEnvelope<T> {
  success: boolean;
  data: T;
  error?: string;
}

export interface WahamsterAccount {
  userId: string;
  channel: {
    id: string;
    name: string;
    phoneNumber: string;
    isActive: boolean;
    healthStatus: string;
  };
  usage: {
    requestCount: number;
    monthlyRequestCount: number;
    monthlyResetAt: string | null;
    lastUsedAt: string | null;
  };
}

export interface WahamsterWebhook {
  id: string;
  url: string;
  events: string[];
  isActive?: boolean;
}

export interface WahamsterContact {
  id: string;
  channelId: string;
  name: string | null;
  phone: string;
  email: string | null;
  status: string;
  source: string | null;
  company: string | null;
  lastContact: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WahamsterContactsPage {
  contacts: WahamsterContact[];
  total: number;
  limit: number;
  offset: number;
}

export interface WahamsterMessage {
  id: string;
  conversationId: string;
  whatsappMessageId: string | null;
  direction: "inbound" | "outbound";
  content: string | null;
  type: string;
  mediaUrl: string | null;
  mediaMimeType: string | null;
  status: string;
  timestamp: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface WahamsterMessagesPage {
  messages: WahamsterMessage[];
  total?: number;
  limit?: number;
  offset?: number;
}

export class WahamsterApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "WahamsterApiError";
  }
}

async function request<T>(
  path: string,
  credentials: { apiKey: string; apiSecret: string },
  options: { method?: string; body?: unknown; label: string },
): Promise<T> {
  try {
    const envelope = await httpRequestJson<WahamsterEnvelope<T>>(`${env.WAHAMSTER_API_BASE_URL}${path}`, {
      method: options.method ?? "GET",
      headers: {
        "X-API-Key": credentials.apiKey,
        "X-API-Secret": credentials.apiSecret,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      label: options.label,
      retries: 2,
    });

    if (!envelope.success) throw new WahamsterApiError(envelope.error ?? "WaHamster request failed");
    return envelope.data;
  } catch (error) {
    if (error instanceof WahamsterApiError) throw error;
    const message = error instanceof Error ? error.message : "Unknown WaHamster API error";
    throw new WahamsterApiError(message);
  }
}

export const wahamsterClient = {
  getAccount(credentials: { apiKey: string; apiSecret: string }): Promise<WahamsterAccount> {
    return request<WahamsterAccount>("/account", credentials, { label: "wahamster.getAccount" });
  },

  listWebhooks(credentials: { apiKey: string; apiSecret: string }): Promise<WahamsterWebhook[]> {
    return request<WahamsterWebhook[]>("/webhooks", credentials, { label: "wahamster.listWebhooks" });
  },

  createWebhook(
    credentials: { apiKey: string; apiSecret: string },
    params: { url: string; events: string[]; secret: string },
  ): Promise<WahamsterWebhook> {
    return request<WahamsterWebhook>("/webhooks", credentials, {
      method: "POST",
      body: params,
      label: "wahamster.createWebhook",
    });
  },

  /** Request body shape is unconfirmed (no docs, and sending a live message during
   *  development would reach a real WhatsApp user) — best-effort `{ phone, message }`. */
  sendReply(
    credentials: { apiKey: string; apiSecret: string },
    params: { phone: string; message: string },
  ): Promise<WahamsterMessage> {
    return request<WahamsterMessage>("/messages/reply", credentials, {
      method: "POST",
      body: params,
      label: "wahamster.sendReply",
    });
  },

  listContacts(
    credentials: { apiKey: string; apiSecret: string },
    params: { limit?: number; offset?: number } = {},
  ): Promise<WahamsterContactsPage> {
    const query = new URLSearchParams();
    if (params.limit !== undefined) query.set("limit", String(params.limit));
    if (params.offset !== undefined) query.set("offset", String(params.offset));
    const qs = query.toString();
    return request<WahamsterContactsPage>(`/contacts${qs ? `?${qs}` : ""}`, credentials, {
      label: "wahamster.listContacts",
    });
  },

  getMessages(
    credentials: { apiKey: string; apiSecret: string },
    phone: string,
    params: { limit?: number; offset?: number } = {},
  ): Promise<WahamsterMessagesPage> {
    const query = new URLSearchParams();
    if (params.limit !== undefined) query.set("limit", String(params.limit));
    if (params.offset !== undefined) query.set("offset", String(params.offset));
    const qs = query.toString();
    return request<WahamsterMessagesPage>(`/messages/${encodeURIComponent(phone)}${qs ? `?${qs}` : ""}`, credentials, {
      label: "wahamster.getMessages",
    });
  },
};
