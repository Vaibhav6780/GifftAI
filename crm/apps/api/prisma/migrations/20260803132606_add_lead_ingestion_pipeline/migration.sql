-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'ERROR', 'PENDING');

-- AlterEnum
ALTER TYPE "ChannelType" ADD VALUE 'LINKEDIN';

-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "externalConversationId" TEXT,
ADD COLUMN     "leadId" TEXT;

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "externalId" TEXT;

-- CreateTable
CREATE TABLE "lead_external_identities" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "channelType" "ChannelType" NOT NULL,
    "externalUserId" TEXT NOT NULL,
    "username" TEXT,
    "profileUrl" TEXT,
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_external_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_connections" (
    "id" TEXT NOT NULL,
    "channelType" "ChannelType" NOT NULL,
    "channelId" TEXT,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "accessTokenEnc" TEXT,
    "refreshTokenEnc" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "externalAccountId" TEXT,
    "config" JSONB,
    "lastSyncedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "connectedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_connections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lead_external_identities_leadId_idx" ON "lead_external_identities"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "lead_external_identities_channelType_externalUserId_key" ON "lead_external_identities"("channelType", "externalUserId");

-- CreateIndex
CREATE UNIQUE INDEX "integration_connections_channelType_key" ON "integration_connections"("channelType");

-- CreateIndex
CREATE INDEX "conversations_leadId_idx" ON "conversations"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_channelId_externalConversationId_key" ON "conversations"("channelId", "externalConversationId");

-- CreateIndex
CREATE UNIQUE INDEX "messages_conversationId_externalId_key" ON "messages"("conversationId", "externalId");

-- AddForeignKey
ALTER TABLE "lead_external_identities" ADD CONSTRAINT "lead_external_identities_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_connections" ADD CONSTRAINT "integration_connections_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "channels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_connections" ADD CONSTRAINT "integration_connections_connectedByUserId_fkey" FOREIGN KEY ("connectedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

