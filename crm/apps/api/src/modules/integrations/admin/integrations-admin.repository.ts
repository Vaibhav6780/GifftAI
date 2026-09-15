import type { Prisma } from "@prisma/client";
import { prisma } from "../../../config/prisma";

const connectionWithConnectedBy = {
  connectedBy: { select: { firstName: true, lastName: true } },
} satisfies Prisma.IntegrationConnectionInclude;

export type IntegrationConnectionWithRelations = Prisma.IntegrationConnectionGetPayload<{
  include: typeof connectionWithConnectedBy;
}>;

export const integrationsAdminRepository = {
  findAll(): Promise<IntegrationConnectionWithRelations[]> {
    return prisma.integrationConnection.findMany({ include: connectionWithConnectedBy });
  },

  findByChannelType(channelType: "INSTAGRAM" | "WHATSAPP" | "LINKEDIN" | "TELEGRAM" | "EMAIL"): Promise<IntegrationConnectionWithRelations | null> {
    return prisma.integrationConnection.findUnique({ where: { channelType }, include: connectionWithConnectedBy });
  },
};
