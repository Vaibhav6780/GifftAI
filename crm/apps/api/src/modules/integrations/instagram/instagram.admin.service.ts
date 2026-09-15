import { prisma } from "../../../config/prisma";
import { env } from "../../../config/env";
import { AppError } from "../../../lib/apiError";
import { decryptSecret, encryptSecret } from "../../../lib/crypto";
import { instagramService } from "./instagram.service";

async function getOrCreateChannel(): Promise<string> {
  const existing = await prisma.channel.findFirst({ where: { type: "INSTAGRAM" } });
  if (existing) return existing.id;
  const created = await prisma.channel.create({ data: { type: "INSTAGRAM", name: "Instagram" } });
  return created.id;
}

async function getAccessToken(): Promise<string | null> {
  const connection = await prisma.integrationConnection.findUnique({ where: { channelType: "INSTAGRAM" } });
  if (!connection?.accessTokenEnc || connection.status !== "CONNECTED") return null;
  return decryptSecret(connection.accessTokenEnc);
}

export const instagramAdminService = {
  /** Called after the OAuth callback exchanges the code for a long-lived user access
   *  token (see instagramService.exchangeForLongLivedToken). */
  async completeConnection(userAccessToken: string, connectedByUserId: string, expiresInSeconds?: number) {
    const pages = await instagramService.listPagesWithInstagramAccount(userAccessToken);
    const match = pages[0];
    if (!match) {
      throw AppError.badRequest(
        "No Facebook Page with a linked Instagram professional account was found for this user — link one in Meta Business Suite first",
      );
    }

    const channelId = await getOrCreateChannel();
    const tokenExpiresAt = expiresInSeconds ? new Date(Date.now() + expiresInSeconds * 1000) : undefined;

    await prisma.integrationConnection.upsert({
      where: { channelType: "INSTAGRAM" },
      create: {
        channelType: "INSTAGRAM",
        channelId,
        status: "CONNECTED",
        accessTokenEnc: encryptSecret(match.pageAccessToken),
        tokenExpiresAt,
        externalAccountId: match.igBusinessAccountId,
        config: { pageId: match.pageId },
        connectedByUserId,
        lastSyncedAt: new Date(),
      },
      update: {
        status: "CONNECTED",
        accessTokenEnc: encryptSecret(match.pageAccessToken),
        tokenExpiresAt,
        externalAccountId: match.igBusinessAccountId,
        config: { pageId: match.pageId },
        connectedByUserId,
        lastError: null,
        lastSyncedAt: new Date(),
      },
    });

    return { igBusinessAccountId: match.igBusinessAccountId };
  },

  /** Re-runs the long-lived-token exchange on the still-valid current token, resetting
   *  its ~60-day clock. Called on a schedule by integration-token-refresh before expiry. */
  async refreshToken(): Promise<{ ok: boolean; error?: string }> {
    const connection = await prisma.integrationConnection.findUnique({ where: { channelType: "INSTAGRAM" } });
    if (!connection?.accessTokenEnc) return { ok: false, error: "Not connected" };
    if (!env.META_APP_ID || !env.META_APP_SECRET) return { ok: false, error: "Meta App credentials not configured" };

    try {
      const currentToken = decryptSecret(connection.accessTokenEnc);
      const result = await instagramService.exchangeForLongLivedToken(currentToken, env.META_APP_ID, env.META_APP_SECRET);
      await prisma.integrationConnection.update({
        where: { channelType: "INSTAGRAM" },
        data: {
          accessTokenEnc: encryptSecret(result.access_token),
          tokenExpiresAt: new Date(Date.now() + result.expires_in * 1000),
          lastError: null,
        },
      });
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await prisma.integrationConnection.update({ where: { channelType: "INSTAGRAM" }, data: { status: "ERROR", lastError: message } });
      return { ok: false, error: message };
    }
  },

  async disconnect(): Promise<void> {
    await prisma.integrationConnection
      .update({ where: { channelType: "INSTAGRAM" }, data: { status: "DISCONNECTED", accessTokenEnc: null } })
      .catch(() => undefined);
  },

  async resync(): Promise<{ ok: boolean; error?: string }> {
    const connection = await prisma.integrationConnection.findUnique({ where: { channelType: "INSTAGRAM" } });
    const accessToken = await getAccessToken();
    if (!accessToken || !connection?.externalAccountId) return { ok: false, error: "Not connected" };

    try {
      await instagramService.getProfile(connection.externalAccountId, accessToken);
      await prisma.integrationConnection.update({
        where: { channelType: "INSTAGRAM" },
        data: { lastSyncedAt: new Date(), lastError: null, status: "CONNECTED" },
      });
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await prisma.integrationConnection.update({ where: { channelType: "INSTAGRAM" }, data: { status: "ERROR", lastError: message } });
      return { ok: false, error: message };
    }
  },

  getAccessToken,
};
