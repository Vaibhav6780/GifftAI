import { prisma } from "../../../config/prisma";
import { decryptSecret, encryptSecret } from "../../../lib/crypto";
import { linkedinService } from "./linkedin.service";

async function getOrCreateChannel(): Promise<string> {
  const existing = await prisma.channel.findFirst({ where: { type: "LINKEDIN" } });
  if (existing) return existing.id;
  const created = await prisma.channel.create({ data: { type: "LINKEDIN", name: "LinkedIn" } });
  return created.id;
}

async function getAccessToken(): Promise<string | null> {
  const connection = await prisma.integrationConnection.findUnique({ where: { channelType: "LINKEDIN" } });
  if (!connection?.accessTokenEnc || connection.status !== "CONNECTED") return null;
  return decryptSecret(connection.accessTokenEnc);
}

export const linkedinAdminService = {
  async completeConnection(accessToken: string, expiresInSeconds: number, connectedByUserId: string) {
    const profile = await linkedinService.getUserInfo(accessToken);
    const channelId = await getOrCreateChannel();
    const tokenExpiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    await prisma.integrationConnection.upsert({
      where: { channelType: "LINKEDIN" },
      create: {
        channelType: "LINKEDIN",
        channelId,
        status: "CONNECTED",
        accessTokenEnc: encryptSecret(accessToken),
        tokenExpiresAt,
        externalAccountId: profile.sub,
        config: { name: profile.name },
        connectedByUserId,
        lastSyncedAt: new Date(),
      },
      update: {
        status: "CONNECTED",
        accessTokenEnc: encryptSecret(accessToken),
        tokenExpiresAt,
        externalAccountId: profile.sub,
        config: { name: profile.name },
        connectedByUserId,
        lastError: null,
        lastSyncedAt: new Date(),
      },
    });

    return { name: profile.name };
  },

  async disconnect(): Promise<void> {
    await prisma.integrationConnection
      .update({ where: { channelType: "LINKEDIN" }, data: { status: "DISCONNECTED", accessTokenEnc: null } })
      .catch(() => undefined);
  },

  async resync(): Promise<{ ok: boolean; error?: string }> {
    const accessToken = await getAccessToken();
    if (!accessToken) return { ok: false, error: "Not connected" };

    try {
      await linkedinService.getUserInfo(accessToken);
      await prisma.integrationConnection.update({
        where: { channelType: "LINKEDIN" },
        data: { lastSyncedAt: new Date(), lastError: null, status: "CONNECTED" },
      });
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await prisma.integrationConnection.update({ where: { channelType: "LINKEDIN" }, data: { status: "ERROR", lastError: message } });
      return { ok: false, error: message };
    }
  },

  /** LinkedIn's OpenID Connect product issues no refresh token — the only way to renew
   *  access near expiry is a full manual reconnect, so this flags the connection instead
   *  of silently failing later. Called by integration-token-refresh.processor.ts. */
  async flagIfExpiringSoon(): Promise<void> {
    await prisma.integrationConnection.update({
      where: { channelType: "LINKEDIN" },
      data: {
        status: "ERROR",
        lastError: "Access token expiring soon — LinkedIn's OpenID Connect flow has no refresh token; reconnect from Settings > Integrations.",
      },
    });
  },

  getAccessToken,
};
