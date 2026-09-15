import { prisma } from "../../config/prisma";
import { logger } from "../../config/logger";
import { instagramAdminService } from "../../modules/integrations/instagram/instagram.admin.service";
import { linkedinAdminService } from "../../modules/integrations/linkedin/linkedin.admin.service";

const REFRESH_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // act on anything expiring within 7 days

/**
 * WhatsApp uses a permanent System User token (no expiry) and Telegram's bot token never
 * expires — neither needs refreshing. Instagram's long-lived user/page token (~60 days)
 * can be silently renewed. LinkedIn's OpenID Connect token has no refresh grant at all —
 * the best this can do is flag the connection so an admin knows to reconnect manually.
 */
export async function integrationTokenRefreshProcessor(): Promise<void> {
  const threshold = new Date(Date.now() + REFRESH_WINDOW_MS);

  const nearExpiry = await prisma.integrationConnection.findMany({
    where: { status: "CONNECTED", tokenExpiresAt: { not: null, lt: threshold } },
  });

  for (const connection of nearExpiry) {
    if (connection.channelType === "INSTAGRAM") {
      const result = await instagramAdminService.refreshToken();
      logger.info({ channelType: connection.channelType, ok: result.ok, error: result.error }, "Integration token refresh attempted");
    } else if (connection.channelType === "LINKEDIN") {
      await linkedinAdminService.flagIfExpiringSoon();
      logger.warn({ channelType: connection.channelType }, "LinkedIn token nearing expiry — no refresh available, flagged for manual reconnect");
    }
  }
}
