import type { IntegrationChannelType, IntegrationConnectionSummary } from "@gifftai/shared";
import { AppError } from "../../../lib/apiError";
import { telegramAdminService } from "../telegram/telegram.admin.service";
import { whatsappAdminService } from "../whatsapp/whatsapp.admin.service";
import { instagramAdminService } from "../instagram/instagram.admin.service";
import { linkedinAdminService } from "../linkedin/linkedin.admin.service";
import { hostingerMailAdminService } from "../hostinger-mail/hostingerMail.admin.service";
import { integrationsAdminRepository, type IntegrationConnectionWithRelations } from "./integrations-admin.repository";

type ConnectedChannelType = Exclude<IntegrationChannelType, "WEBSITE">;

const PLATFORM_SERVICES = {
  TELEGRAM: telegramAdminService,
  WHATSAPP: whatsappAdminService,
  INSTAGRAM: instagramAdminService,
  LINKEDIN: linkedinAdminService,
  EMAIL: hostingerMailAdminService,
} satisfies Record<ConnectedChannelType, { disconnect: () => Promise<void>; resync: () => Promise<{ ok: boolean; error?: string }> }>;

function isConnectedChannelType(channelType: IntegrationChannelType): channelType is ConnectedChannelType {
  return channelType !== "WEBSITE";
}

function toSummary(channelType: IntegrationChannelType, row: IntegrationConnectionWithRelations | null): IntegrationConnectionSummary {
  if (!row) {
    return {
      channelType,
      status: "DISCONNECTED",
      externalAccountId: null,
      hasToken: false,
      tokenExpiresAt: null,
      lastSyncedAt: null,
      lastError: null,
      connectedByName: null,
      createdAt: null,
    };
  }

  return {
    channelType,
    status: row.status,
    externalAccountId: row.externalAccountId,
    hasToken: Boolean(row.accessTokenEnc),
    tokenExpiresAt: row.tokenExpiresAt?.toISOString() ?? null,
    lastSyncedAt: row.lastSyncedAt?.toISOString() ?? null,
    lastError: row.lastError,
    connectedByName: row.connectedBy ? `${row.connectedBy.firstName} ${row.connectedBy.lastName}` : null,
    createdAt: row.createdAt.toISOString(),
  };
}

const WEBSITE_SUMMARY: IntegrationConnectionSummary = {
  channelType: "WEBSITE",
  status: "CONNECTED",
  externalAccountId: null,
  hasToken: false,
  tokenExpiresAt: null,
  lastSyncedAt: null,
  lastError: null,
  connectedByName: null,
  createdAt: null,
};

export const integrationsAdminService = {
  async list(): Promise<IntegrationConnectionSummary[]> {
    const rows = await integrationsAdminRepository.findAll();
    const rowByChannelType = new Map(rows.map((row) => [row.channelType, row]));

    return [
      WEBSITE_SUMMARY,
      toSummary("INSTAGRAM", rowByChannelType.get("INSTAGRAM") ?? null),
      toSummary("WHATSAPP", rowByChannelType.get("WHATSAPP") ?? null),
      toSummary("LINKEDIN", rowByChannelType.get("LINKEDIN") ?? null),
      toSummary("TELEGRAM", rowByChannelType.get("TELEGRAM") ?? null),
      toSummary("EMAIL", rowByChannelType.get("EMAIL") ?? null),
    ];
  },

  async getByChannelType(channelType: IntegrationChannelType): Promise<IntegrationConnectionSummary> {
    if (channelType === "WEBSITE") return WEBSITE_SUMMARY;
    const row = await integrationsAdminRepository.findByChannelType(channelType);
    return toSummary(channelType, row);
  },

  async disconnect(channelType: IntegrationChannelType): Promise<void> {
    if (!isConnectedChannelType(channelType)) throw AppError.badRequest("Website has no connection to disconnect");
    await PLATFORM_SERVICES[channelType].disconnect();
  },

  async resync(channelType: IntegrationChannelType): Promise<{ ok: boolean; error?: string }> {
    if (!isConnectedChannelType(channelType)) return { ok: true };
    return PLATFORM_SERVICES[channelType].resync();
  },
};
