-- CreateTable
CREATE TABLE "email_message_details" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "hostingerMessageId" TEXT NOT NULL,
    "hostingerFolder" TEXT NOT NULL,
    "hostingerUid" INTEGER NOT NULL,
    "mailboxAddress" TEXT NOT NULL,
    "fromAddress" TEXT,
    "fromName" TEXT,
    "toAddresses" JSONB NOT NULL,
    "ccAddresses" JSONB,
    "bccAddresses" JSONB,
    "inReplyToMessageId" TEXT,
    "hasAttachments" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_message_details_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_message_details_messageId_key" ON "email_message_details"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "email_message_details_hostingerMessageId_key" ON "email_message_details"("hostingerMessageId");

-- CreateIndex
CREATE INDEX "email_message_details_hostingerFolder_hostingerUid_idx" ON "email_message_details"("hostingerFolder", "hostingerUid");

-- AddForeignKey
ALTER TABLE "email_message_details" ADD CONSTRAINT "email_message_details_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
