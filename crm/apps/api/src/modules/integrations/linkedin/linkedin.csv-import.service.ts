import { parse } from "csv-parse/sync";
import type { LinkedInImportResult } from "@gifftai/shared";
import { AppError } from "../../../lib/apiError";
import { leadIngestionService } from "../../lead-ingestion/lead-ingestion.service";

/** LinkedIn's own Lead Gen Form CSV export column names, plus common variants seen when
 *  a form has been renamed or re-exported through Campaign Manager. */
const COLUMN_ALIASES = {
  firstName: ["First Name", "first name", "firstName"],
  lastName: ["Last Name", "last name", "lastName"],
  email: ["Email Address", "Email", "email"],
  phone: ["Phone Number", "Phone", "phone"],
  company: ["Company Name", "Company", "company"],
} as const;

function pick(row: Record<string, string>, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    if (row[key]?.trim()) return row[key].trim();
  }
  return undefined;
}

/**
 * Manual CSV import of LinkedIn Lead Gen Form exports — the closest officially-sanctioned
 * alternative available without LinkedIn Marketing Partner Program approval (see
 * LEAD_INGESTION.md). Rows go through the same leadIngestionService.ingest() pipeline as
 * every real-time source, just with no externalUserId/externalConversationId (no ongoing
 * conversation identity to dedupe against — only email/phone matching applies).
 */
export const linkedinCsvImportService = {
  async importCsv(buffer: Buffer): Promise<LinkedInImportResult> {
    let rows: Record<string, string>[];
    try {
      rows = parse(buffer, { columns: true, skip_empty_lines: true, trim: true });
    } catch {
      throw AppError.badRequest("Could not parse this file as CSV — check the format and try again");
    }

    const result: LinkedInImportResult = { imported: 0, updated: 0, skipped: 0, errors: [] };

    for (const [index, row] of rows.entries()) {
      const rowNumber = index + 2; // +1 for header row, +1 for 1-based row numbering
      const email = pick(row, COLUMN_ALIASES.email);
      const phone = pick(row, COLUMN_ALIASES.phone);

      if (!email && !phone) {
        result.skipped++;
        result.errors.push(`Row ${rowNumber}: no email or phone column found — skipped`);
        continue;
      }

      try {
        const { created } = await leadIngestionService.ingest({
          source: "LINKEDIN",
          firstName: pick(row, COLUMN_ALIASES.firstName) ?? "Unknown",
          lastName: pick(row, COLUMN_ALIASES.lastName),
          email,
          phone,
          company: pick(row, COLUMN_ALIASES.company),
          message: "Imported from LinkedIn Lead Gen Form CSV export",
          occurredAt: new Date(),
          raw: row,
        });
        if (created) result.imported++;
        else result.updated++;
      } catch (error) {
        result.errors.push(`Row ${rowNumber}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    return result;
  },
};
