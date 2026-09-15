-- CreateTable
CREATE TABLE "lead_followups" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "followupDate" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_followups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lead_followups_leadId_idx" ON "lead_followups"("leadId");

-- CreateIndex
CREATE INDEX "lead_followups_followupDate_idx" ON "lead_followups"("followupDate");

-- AddForeignKey
ALTER TABLE "lead_followups" ADD CONSTRAINT "lead_followups_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: give every currently-active follow-up (needsFollowup = true, which already
-- implies followupDate IS NOT NULL -- enforced in leadsService.update) one open history row,
-- so the new Complete/Incomplete filter shows today's/upcoming due leads immediately after
-- this deploy instead of only leads touched from here on. gen_random_uuid() (built into
-- Postgres, no extension needed) stands in for Prisma's cuid() default, which is
-- client-side-only and unavailable to raw migration SQL -- the app never validates id format.
-- Follow-ups completed BEFORE this migration have no history and won't appear for past
-- dates -- there's nothing to backfill that from, it was never recorded.
INSERT INTO "lead_followups" ("id", "leadId", "followupDate", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, "id", "followupDate", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "leads"
WHERE "needsFollowup" = true AND "followupDate" IS NOT NULL;
