import { prisma } from "../config/prisma";
import { AppError } from "./apiError";

const SYSTEM_USER_EMAIL = "system@gifftai-crm.local";

let cachedId: string | undefined;

/**
 * Resolves the seeded system user (prisma/seed.ts), used as Attachment.uploadedById for
 * files ingested automatically by the lead-ingestion pipeline where no human uploaded them.
 * Memoized in-process — this row is immutable after seeding.
 */
export async function getSystemUserId(): Promise<string> {
  if (cachedId) return cachedId;

  const user = await prisma.user.findUnique({ where: { email: SYSTEM_USER_EMAIL }, select: { id: true } });
  if (!user) {
    throw AppError.internal(
      "System user not found — run `pnpm db:seed` to create it before ingesting attachments",
    );
  }

  cachedId = user.id;
  return cachedId;
}
