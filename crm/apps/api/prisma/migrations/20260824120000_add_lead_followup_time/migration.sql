-- AlterTable: optional "HH:mm" time-of-day alongside the existing followupDate, on both the
-- live Lead row and its LeadFollowup history rows. Nullable, no default, no backfill --
-- every follow-up scheduled before this migration simply has no time (matches its actual
-- prior behavior of being date-only).
ALTER TABLE "leads" ADD COLUMN "followupTime" TEXT;

ALTER TABLE "lead_followups" ADD COLUMN "followupTime" TEXT;
