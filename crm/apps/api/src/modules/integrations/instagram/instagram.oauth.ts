import type { Request, Response } from "express";
import type { ApiResponse } from "@gifftai/shared";
import { env } from "../../../config/env";
import { AppError } from "../../../lib/apiError";
import { asyncHandler } from "../../../lib/asyncHandler";
import { logger } from "../../../config/logger";
import { oauthState } from "../shared/oauth.state";
import { instagramService } from "./instagram.service";
import { instagramAdminService } from "./instagram.admin.service";

const OAUTH_PURPOSE = "instagram";
const SCOPES = ["instagram_basic", "instagram_manage_messages", "pages_show_list", "pages_manage_metadata"].join(",");

function redirectUri(): string {
  return `${env.API_URL}/public/oauth/instagram/callback`;
}

export const instagramOAuth = {
  /**
   * Authenticated — only a logged-in admin (already gated by requirePermission on this
   * route) should be able to kick off a connection. Returns the authorization URL as JSON
   * rather than issuing a 302 itself: the SPA's auth uses an in-memory Bearer token (not a
   * cookie), so a plain browser navigation straight to this endpoint would have no way to
   * authenticate. The frontend calls this via its authenticated API client, then does
   * `window.location.href = url` itself.
   */
  start: asyncHandler(async (req: Request, res: Response) => {
    if (!env.META_APP_ID) throw AppError.badRequest("META_APP_ID is not configured — see LEAD_INGESTION.md");

    const state = await oauthState.create(OAUTH_PURPOSE, { userId: req.user!.id });
    const url = new URL("https://www.facebook.com/v21.0/dialog/oauth");
    url.searchParams.set("client_id", env.META_APP_ID);
    url.searchParams.set("redirect_uri", redirectUri());
    url.searchParams.set("state", state);
    url.searchParams.set("scope", SCOPES);
    url.searchParams.set("response_type", "code");

    const body: ApiResponse<{ url: string }> = { success: true, data: { url: url.toString() } };
    res.status(200).json(body);
  }),

  /** Public — Meta redirects the user's browser here directly, with no Authorization
   *  header available; the admin's identity travels via the state payload instead. */
  callback: asyncHandler(async (req: Request, res: Response) => {
    const { code, state, error, error_description: errorDescription } = req.query as Record<string, string | undefined>;

    if (error) {
      res.status(400).send(`Instagram connection failed: ${errorDescription ?? error}`);
      return;
    }
    if (!code || !state) {
      res.status(400).send("Missing code or state");
      return;
    }

    const statePayload = await oauthState.consume<{ userId: string }>(OAUTH_PURPOSE, state);
    if (!statePayload) {
      res.status(400).send("Invalid or expired OAuth state — please retry connecting from the Integrations page");
      return;
    }
    if (!env.META_APP_ID || !env.META_APP_SECRET) {
      res.status(500).send("Meta App credentials are not configured on the server");
      return;
    }

    try {
      const shortLived = await instagramService.exchangeCodeForToken({
        code,
        redirectUri: redirectUri(),
        clientId: env.META_APP_ID,
        clientSecret: env.META_APP_SECRET,
      });
      const longLived = await instagramService.exchangeForLongLivedToken(
        shortLived.access_token,
        env.META_APP_ID,
        env.META_APP_SECRET,
      );
      await instagramAdminService.completeConnection(longLived.access_token, statePayload.userId, longLived.expires_in);

      res.redirect(`${env.WEB_URL}/settings/integrations?connected=instagram`);
    } catch (err) {
      logger.error({ err }, "Instagram OAuth callback failed");
      res.status(502).send("Failed to complete the Instagram connection — check server logs");
    }
  }),
};
