import { httpRequestJson } from "../../../lib/httpClient";

const GRAPH_API_BASE = "https://graph.facebook.com/v21.0";

export interface InstagramAttachment {
  type: string;
  payload: { url?: string };
}

export interface InstagramMessage {
  mid: string;
  text?: string;
  is_echo?: boolean;
  attachments?: InstagramAttachment[];
}

export interface InstagramMessagingEvent {
  sender: { id: string };
  recipient: { id: string };
  timestamp: number;
  message?: InstagramMessage;
}

export interface InstagramPageWithAccount {
  pageId: string;
  pageAccessToken: string;
  igBusinessAccountId: string;
}

export const instagramService = {
  /** Throws on failure — used both for profile enrichment (caller decides whether to
   *  tolerate failure) and as the resync health-check call. */
  async getProfile(igsid: string, accessToken: string): Promise<{ name?: string; username?: string }> {
    return httpRequestJson(`${GRAPH_API_BASE}/${igsid}?fields=name,username`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      label: "instagram.getProfile",
      retries: 1,
    });
  },

  async exchangeCodeForToken(params: {
    code: string;
    redirectUri: string;
    clientId: string;
    clientSecret: string;
  }): Promise<{ access_token: string }> {
    const url = new URL(`${GRAPH_API_BASE}/oauth/access_token`);
    url.searchParams.set("client_id", params.clientId);
    url.searchParams.set("client_secret", params.clientSecret);
    url.searchParams.set("redirect_uri", params.redirectUri);
    url.searchParams.set("code", params.code);
    return httpRequestJson(url.toString(), { label: "instagram.exchangeCodeForToken", retries: 1 });
  },

  /** Short-lived user tokens (from exchangeCodeForToken) expire in ~1-2 hours. Exchanging
   *  for a long-lived token (~60 days) is what makes "automatic refresh" possible at all —
   *  re-running this same exchange on the still-valid long-lived token resets its clock,
   *  which integration-token-refresh.processor.ts does on a schedule before expiry. */
  async exchangeForLongLivedToken(
    token: string,
    clientId: string,
    clientSecret: string,
  ): Promise<{ access_token: string; expires_in: number }> {
    const url = new URL(`${GRAPH_API_BASE}/oauth/access_token`);
    url.searchParams.set("grant_type", "fb_exchange_token");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("client_secret", clientSecret);
    url.searchParams.set("fb_exchange_token", token);
    return httpRequestJson(url.toString(), { label: "instagram.exchangeForLongLivedToken", retries: 1 });
  },

  /**
   * Instagram Messaging requires a Facebook Page with a linked Instagram professional
   * account; the OAuth user token alone isn't enough to send/receive messages. Resolves
   * every Page the OAuth'd user manages, filtered to ones with a linked IG account.
   * v1 simplification: the admin service picks the first match (documented in
   * LEAD_INGESTION.md) rather than exposing a page-picker UI.
   */
  async listPagesWithInstagramAccount(userAccessToken: string): Promise<InstagramPageWithAccount[]> {
    const pages = await httpRequestJson<{ data: { id: string; access_token: string }[] }>(
      `${GRAPH_API_BASE}/me/accounts?fields=id,access_token`,
      { headers: { Authorization: `Bearer ${userAccessToken}` }, label: "instagram.listPages", retries: 1 },
    );

    const results: InstagramPageWithAccount[] = [];
    for (const page of pages.data ?? []) {
      const detail = await httpRequestJson<{ instagram_business_account?: { id: string } }>(
        `${GRAPH_API_BASE}/${page.id}?fields=instagram_business_account`,
        { headers: { Authorization: `Bearer ${page.access_token}` }, label: "instagram.pageDetail", retries: 1 },
      ).catch(() => null);

      if (detail?.instagram_business_account?.id) {
        results.push({ pageId: page.id, pageAccessToken: page.access_token, igBusinessAccountId: detail.instagram_business_account.id });
      }
    }
    return results;
  },
};
