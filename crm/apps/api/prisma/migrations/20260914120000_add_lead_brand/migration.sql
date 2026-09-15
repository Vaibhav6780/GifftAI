-- AlterEnum: which product/company a lead belongs to. Everything else about a lead (status,
-- follow-ups, contacted-today activity, notes) stays on the exact same Lead row/pipeline --
-- this is purely a tag so the "Gifttai" sidebar section can filter the same Leads/Follow-ups/
-- Contacted Today views down to its own leads instead of standing up parallel tables.
CREATE TYPE "LeadBrand" AS ENUM ('SWISDEX', 'GIFTTAI');

-- Defaults every existing row (and every row written by existing ingestion channels, which
-- predate this column) to SWISDEX, so today's behavior is unchanged unless a lead is
-- explicitly created as GIFTTAI.
ALTER TABLE "leads" ADD COLUMN "brand" "LeadBrand" NOT NULL DEFAULT 'SWISDEX';

CREATE INDEX "leads_brand_idx" ON "leads"("brand");
