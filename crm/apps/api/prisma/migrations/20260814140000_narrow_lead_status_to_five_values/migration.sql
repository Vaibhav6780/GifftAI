-- Replace LeadStatus's 6 values (NEW, CONTACTED, QUALIFIED, UNQUALIFIED, CONVERTED, LOST)
-- with 5 new ones (NEW, HOT, WARM, COLD, LOST). Prisma can't auto-map removed enum values,
-- so existing rows are remapped explicitly here rather than dropped:
--   CONTACTED   -> WARM  (some engagement, not yet qualified — product decision)
--   QUALIFIED   -> HOT   (a qualified prospect reads as a hot lead under the new scheme)
--   UNQUALIFIED -> COLD
--   CONVERTED   -> HOT   (conversion state now lives entirely on Lead.convertedContactId/
--                          convertedAt, independent of status — see leadsService.convert)
--   LOST        -> LOST  (unchanged)
-- At the time this was written, prod had 800 NEW and 2 CONTACTED rows; QUALIFIED/
-- UNQUALIFIED/CONVERTED had zero rows, so only the CONTACTED->WARM mapping affects real data.
CREATE TYPE "LeadStatus_new" AS ENUM ('NEW', 'HOT', 'WARM', 'COLD', 'LOST');

ALTER TABLE "leads" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "leads" ALTER COLUMN "status" TYPE "LeadStatus_new" USING (
  CASE "status"::text
    WHEN 'NEW' THEN 'NEW'
    WHEN 'CONTACTED' THEN 'WARM'
    WHEN 'QUALIFIED' THEN 'HOT'
    WHEN 'UNQUALIFIED' THEN 'COLD'
    WHEN 'CONVERTED' THEN 'HOT'
    WHEN 'LOST' THEN 'LOST'
  END
)::"LeadStatus_new";
ALTER TABLE "leads" ALTER COLUMN "status" SET DEFAULT 'NEW';

DROP TYPE "LeadStatus";
ALTER TYPE "LeadStatus_new" RENAME TO "LeadStatus";
