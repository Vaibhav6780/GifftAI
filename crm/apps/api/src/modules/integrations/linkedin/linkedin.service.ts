import { httpRequestJson } from "../../../lib/httpClient";

const AUTH_BASE = "https://www.linkedin.com/oauth/v2";
const API_BASE = "https://api.linkedin.com/v2";

export interface LinkedInUserInfo {
  sub: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  email?: string;
  picture?: string;
}

/**
 * "Sign In with LinkedIn using OpenID Connect" — identity only. LinkedIn's actual lead
 * data APIs (Lead Sync API for Lead Gen Forms, Messaging API) require approval into
 * LinkedIn's Marketing Partner Program, which most individual developers cannot self-serve
 * into (see LEAD_INGESTION.md). This OAuth connection exists to attribute "Connected as
 * ___" in the admin UI; actual lead capture goes through CSV import instead.
 */
export const linkedinService = {
  async exchangeCodeForToken(params: {
    code: string;
    redirectUri: string;
    clientId: string;
    clientSecret: string;
  }): Promise<{ access_token: string; expires_in: number }> {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code: params.code,
      redirect_uri: params.redirectUri,
      client_id: params.clientId,
      client_secret: params.clientSecret,
    });
    return httpRequestJson(`${AUTH_BASE}/accessToken`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      label: "linkedin.exchangeCodeForToken",
      retries: 1,
    });
  },

  async getUserInfo(accessToken: string): Promise<LinkedInUserInfo> {
    return httpRequestJson(`${API_BASE}/userinfo`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      label: "linkedin.getUserInfo",
      retries: 1,
    });
  },
};
