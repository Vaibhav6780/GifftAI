import {
  AccountApi,
  Configuration,
  MessagesApi,
  WebhooksApi,
  type V1FolderMessagesMessage,
  type V1FolderMessagesSearchRequest,
  type V1MeMailbox,
  type V1WebhooksWebhook,
} from "hostinger-mail-api-sdk";

/** Thin wrapper around the official `hostinger-mail-api-sdk` (npm install
 *  hostinger-mail-api-sdk — see docs.hostinger.com/api-reference/email-sdks). Every method
 *  here maps 1:1 onto a documented Hostinger Mail API v1 endpoint (openapi.json at
 *  github.com/hostinger/mail-api) — nothing here is guessed.
 *
 *  Notably absent: any "send as alias" support. V1.Send.Request has no `from`/`replyTo`
 *  field — the REST Send API can only send as the mailbox's own address. Outbound mail in
 *  this module goes over SMTP instead (hostingerMail.smtp.ts) so the chosen alias can be
 *  set as the From header; this client only covers inbox/search/flags/webhooks. */

export const INBOX_FOLDER = "INBOX";
export const SENT_FOLDER = "INBOX.Sent";

export interface HostingerMailCredentials {
  apiToken: string;
}

export type HostingerMessage = V1FolderMessagesMessage;
export type HostingerMailbox = V1MeMailbox;

function buildClients(credentials: HostingerMailCredentials) {
  const configuration = new Configuration({ accessToken: credentials.apiToken });
  return {
    account: new AccountApi(configuration),
    messages: new MessagesApi(configuration),
    webhooks: new WebhooksApi(configuration),
  };
}

export const hostingerMailClient = {
  /** GET /api/v1/me — used both to verify a token on connect and to resolve the mailbox's
   *  resourceId (the API exposes exactly one mailbox; aliases aren't separate resources). */
  async getAccount(credentials: HostingerMailCredentials): Promise<{ orderResourceId: string; mailboxes: HostingerMailbox[] }> {
    const { account } = buildClients(credentials);
    const { data } = await account.getCurrentAccount();
    return data.data;
  },

  async listMessages(
    credentials: HostingerMailCredentials,
    mailboxResourceId: string,
    folder: string,
    params: { page?: number; perPage?: number } = {},
  ): Promise<{ items: HostingerMessage[]; total: number; totalPages: number }> {
    const { messages } = buildClients(credentials);
    const { data } = await messages.listMessages(mailboxResourceId, folder, params.page, params.perPage, "-uid");
    return { items: data.data, total: data.pagination.total, totalPages: data.pagination.totalPages };
  },

  async searchMessages(
    credentials: HostingerMailCredentials,
    mailboxResourceId: string,
    folder: string,
    filters: { subject?: string; from?: string; to?: string; text?: string },
    params: { page?: number; perPage?: number } = {},
  ): Promise<{ items: HostingerMessage[]; total: number; totalPages: number }> {
    const { messages } = buildClients(credentials);
    // The SDK's generated type marks every search field required even though the API docs
    // say "All fields optional; combine to narrow results" — passing only the fields we set
    // is the documented, correct behavior; the cast works around the SDK's over-strict type.
    const { data } = await messages.searchMessages(
      mailboxResourceId,
      folder,
      params.page,
      params.perPage,
      "-uid",
      filters as V1FolderMessagesSearchRequest,
    );
    return { items: data.data, total: data.pagination.total, totalPages: data.pagination.totalPages };
  },

  async getMessage(
    credentials: HostingerMailCredentials,
    mailboxResourceId: string,
    folder: string,
    uid: number,
  ): Promise<HostingerMessage> {
    const { messages } = buildClients(credentials);
    const { data } = await messages.getMessage(mailboxResourceId, folder, uid);
    return data.data;
  },

  /** GET .../messages/{uid}/text — the only way to fetch a message's actual body; list/get
   *  return metadata only. Per the OpenAPI spec this call marks the message `\Seen` on
   *  Hostinger's side as a side effect, so ingesting a message (which calls this to store
   *  its body locally) makes Hostinger consider it read even though our own `isRead` stays
   *  false until an agent opens it in the CRM — a real API limitation, not a bug here. */
  async getMessageText(
    credentials: HostingerMailCredentials,
    mailboxResourceId: string,
    folder: string,
    uid: number,
  ): Promise<{ text: string; html: string }> {
    const { messages } = buildClients(credentials);
    const { data } = await messages.getMessageText(mailboxResourceId, folder, uid);
    return data.data;
  },

  /** Adds/removes IMAP flags on one message — used to push `\Seen` to Hostinger when an
   *  agent marks a CRM inbox item read, so webmail/other clients stay in sync. Best-effort:
   *  callers should not fail the whole mark-read action if this throws. */
  async setMessageFlags(
    credentials: HostingerMailCredentials,
    mailboxResourceId: string,
    folder: string,
    uid: number,
    flags: { addFlags?: string[]; removeFlags?: string[] },
  ): Promise<void> {
    const { messages } = buildClients(credentials);
    await messages.patchMessage(mailboxResourceId, folder, uid, {
      addFlags: flags.addFlags ?? [],
      removeFlags: flags.removeFlags ?? [],
    });
  },

  /** Restores `\Seen` to unset right after getMessageText marked it — confirmed against the
   *  live API that a bare removeFlags call issued immediately after getMessageText loses a
   *  race: Hostinger applies its own \Seen-add asynchronously, and back-to-back calls can
   *  land in either order, sometimes leaving the message Seen despite the removeFlags call
   *  having "succeeded" (200, unseen:true in the response) — a re-fetch moments later shows
   *  \Seen again. Retrying with backoff and verifying via a fresh GET, rather than trusting
   *  the patch response, reliably wins the race in practice. Best-effort: gives up silently
   *  after the last attempt (see the processor's module comment on why this is non-fatal). */
  async restoreUnseen(credentials: HostingerMailCredentials, mailboxResourceId: string, folder: string, uid: number): Promise<boolean> {
    const { messages } = buildClients(credentials);
    const delaysMs = [300, 800, 1500];

    for (const delayMs of delaysMs) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      await messages.patchMessage(mailboxResourceId, folder, uid, { addFlags: [], removeFlags: ["\\Seen"] });
      const { data } = await messages.getMessage(mailboxResourceId, folder, uid);
      if (data.data.unseen) return true;
    }
    return false;
  },

  async listWebhooks(credentials: HostingerMailCredentials, mailboxResourceId: string): Promise<{ id: string; url: string }[]> {
    const { webhooks } = buildClients(credentials);
    const { data } = await webhooks.listWebhooks(mailboxResourceId);
    return data.data.map((hook: V1WebhooksWebhook) => ({ id: hook.id, url: hook.url }));
  },

  /** Returns the one-time `secret` — Hostinger sends it as `Authorization: Bearer <secret>`
   *  on every webhook delivery, which doubles as the signature check (see
   *  hostingerMail.webhook.controller.ts). Never returned again after this call. */
  async createWebhook(credentials: HostingerMailCredentials, mailboxResourceId: string, url: string): Promise<string> {
    const { webhooks } = buildClients(credentials);
    const { data } = await webhooks.createWebhook(mailboxResourceId, {
      name: "GifftAI CRM inbound mail",
      description: "Notifies the CRM when new mail arrives",
      events: ["message.received"],
      status: "active",
      url,
    });
    return data.data.secret;
  },
};
