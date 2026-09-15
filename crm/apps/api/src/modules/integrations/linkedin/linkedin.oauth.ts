import type { Request, Response } from "express";
import type { ApiResponse } from "@gifftai/shared";
import { env } from "../../../config/env";
import { AppError } from "../../../lib/apiError";
import { asyncHandler } from "../../../lib/asyncHandler";
import { logger } from "../../../config/logger";
import { oauthState } from "../shared/oauth.state";
import { linkedinService } from "./linkedin.service";
import { linkedinAdminService } from "./linkedin.admin.service";

const OAUTH_PURPOSE = "linkedin";
const SCOPES = "openid profile email";

function redirectUri(): string {
  return `${env.API_URL}/public/oauth/linkedin/callback`;
}

export const linkedinOAuth = {
  /** Returns the authorization URL as JSON rather than redirecting — see the matching
   *  comment in instagram.oauth.ts's start handler for why. */
  start: asyncHandler(async (req: Request, res: Response) => {
    if (!env.LINKEDIN_CLIENT_ID) throw AppError.badRequest("LINKEDIN_CLIENT_ID is not configured — see LEAD_INGESTION.md");

    const state = await oauthState.create(OAUTH_PURPOSE, { userId: req.user!.id });
    const url = new URL("https://www.linkedin.com/oauth/v2/authorization");
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", env.LINKEDIN_CLIENT_ID);
    url.searchParams.set("redirect_uri", redirectUri());
    url.searchParams.set("state", state);
    url.searchParams.set("scope", SCOPES);

    const body: ApiResponse<{ url: string }> = { success: true, data: { url: url.toString() } };
    res.status(200).json(body);
  }),

  callback: asyncHandler(async (req: Request, res: Response) => {
    const { code, state, error, error_description: errorDescription } = req.query as Record<string, string | undefined>;

    if (error) {
      res.status(400).send(`LinkedIn connection failed: ${errorDescription ?? error}`);
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
    if (!env.LINKEDIN_CLIENT_ID || !env.LINKEDIN_CLIENT_SECRET) {
      res.status(500).send("LinkedIn app credentials are not configured on the server");
      return;
    }

    try {
      const tokenResult = await linkedinService.exchangeCodeForToken({
        code,
        redirectUri: redirectUri(),
        clientId: env.LINKEDIN_CLIENT_ID,
        clientSecret: env.LINKEDIN_CLIENT_SECRET,
      });
      await linkedinAdminService.completeConnection(tokenResult.access_token, tokenResult.expires_in, statePayload.userId);

      res.redirect(`${env.WEB_URL}/settings/integrations?connected=linkedin`);
    } catch (err) {
      logger.error({ err }, "LinkedIn OAuth callback failed");
      res.status(502).send("Failed to complete the LinkedIn connection — check server logs");
    }
  }),
};
