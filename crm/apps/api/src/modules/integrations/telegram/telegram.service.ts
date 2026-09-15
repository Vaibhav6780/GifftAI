import { httpRequestJson } from "../../../lib/httpClient";

const TELEGRAM_API_BASE = "https://api.telegram.org";

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
}

export interface TelegramPhotoSize {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
}

export interface TelegramDocument {
  file_id: string;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
}

export interface TelegramContact {
  phone_number: string;
  first_name: string;
  last_name?: string;
  user_id?: number;
}

export interface TelegramChat {
  id: number;
  type: string;
  first_name?: string;
  last_name?: string;
  username?: string;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  caption?: string;
  photo?: TelegramPhotoSize[];
  document?: TelegramDocument;
  contact?: TelegramContact;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

function apiUrl(botToken: string, method: string): string {
  return `${TELEGRAM_API_BASE}/bot${botToken}/${method}`;
}

export const telegramService = {
  async getMe(botToken: string): Promise<TelegramUser> {
    const result = await httpRequestJson<{ ok: boolean; result: TelegramUser }>(apiUrl(botToken, "getMe"), {
      label: "telegram.getMe",
      retries: 1,
    });
    if (!result.ok) throw new Error("Telegram getMe failed");
    return result.result;
  },

  async setWebhook(botToken: string, url: string, secretToken: string): Promise<void> {
    const result = await httpRequestJson<{ ok: boolean; description?: string }>(apiUrl(botToken, "setWebhook"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url, secret_token: secretToken, allowed_updates: ["message"] }),
      label: "telegram.setWebhook",
      retries: 1,
    });
    if (!result.ok) throw new Error(result.description ?? "Telegram setWebhook failed");
  },

  async deleteWebhook(botToken: string): Promise<void> {
    await httpRequestJson(apiUrl(botToken, "deleteWebhook"), {
      method: "POST",
      label: "telegram.deleteWebhook",
      retries: 1,
    });
  },

  /** Long-poll — the caller's timeoutMs must exceed timeoutSeconds since Telegram holds
   *  the connection open until an update arrives or the poll window elapses. */
  async getUpdates(botToken: string, offset: number, timeoutSeconds: number): Promise<TelegramUpdate[]> {
    const result = await httpRequestJson<{ ok: boolean; result: TelegramUpdate[] }>(apiUrl(botToken, "getUpdates"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ offset, timeout: timeoutSeconds, allowed_updates: ["message"] }),
      timeoutMs: (timeoutSeconds + 10) * 1000,
      retries: 1,
      label: "telegram.getUpdates",
    });
    if (!result.ok) throw new Error("Telegram getUpdates failed");
    return result.result;
  },

  async sendMessage(botToken: string, chatId: string, text: string): Promise<TelegramMessage> {
    const result = await httpRequestJson<{ ok: boolean; description?: string; result: TelegramMessage }>(
      apiUrl(botToken, "sendMessage"),
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text }),
        label: "telegram.sendMessage",
        retries: 1,
      },
    );
    if (!result.ok) throw new Error(result.description ?? "Telegram sendMessage failed");
    return result.result;
  },

  async getFileDownloadUrl(botToken: string, fileId: string): Promise<string | undefined> {
    const result = await httpRequestJson<{ ok: boolean; result?: { file_path?: string } }>(
      `${apiUrl(botToken, "getFile")}?file_id=${encodeURIComponent(fileId)}`,
      { label: "telegram.getFile", retries: 1 },
    );
    if (!result.ok || !result.result?.file_path) return undefined;
    return `${TELEGRAM_API_BASE}/file/bot${botToken}/${result.result.file_path}`;
  },
};
