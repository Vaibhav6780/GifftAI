-- CreateEnum
CREATE TYPE "AttendanceLocation" AS ENUM ('OFFICE', 'REMOTE');

-- DropForeignKey
ALTER TABLE "trusted_devices" DROP CONSTRAINT "trusted_devices_userId_fkey";

-- DropIndex
DROP INDEX "attendance_sessions_userId_loginAt_idx";

-- DropIndex
DROP INDEX "attendance_sessions_userId_logoutAt_idx";

-- RenameColumn (preserve history instead of drop+recreate)
ALTER TABLE "attendance_sessions" RENAME COLUMN "loginAt" TO "onlineAt";
ALTER TABLE "attendance_sessions" RENAME COLUMN "logoutAt" TO "offlineAt";

-- AlterTable: add location, backfilled for existing rows. Historical office/remote can't be
-- reliably reconstructed from the old device+heartbeat model, so existing rows default to
-- REMOTE as a one-time approximation; new rows always set it explicitly (see schema.prisma).
ALTER TABLE "attendance_sessions" ADD COLUMN "location" "AttendanceLocation" NOT NULL DEFAULT 'REMOTE';
ALTER TABLE "attendance_sessions" ALTER COLUMN "location" DROP DEFAULT;

-- AlterTable: drop device/heartbeat columns, no longer used
ALTER TABLE "attendance_sessions" DROP COLUMN "browser";
ALTER TABLE "attendance_sessions" DROP COLUMN "deviceId";
ALTER TABLE "attendance_sessions" DROP COLUMN "deviceName";
ALTER TABLE "attendance_sessions" DROP COLUMN "lastHeartbeatAt";
ALTER TABLE "attendance_sessions" DROP COLUMN "os";

-- DropTable
DROP TABLE "trusted_devices";

-- CreateIndex
CREATE INDEX "attendance_sessions_userId_onlineAt_idx" ON "attendance_sessions"("userId", "onlineAt");

-- CreateIndex
CREATE INDEX "attendance_sessions_userId_offlineAt_idx" ON "attendance_sessions"("userId", "offlineAt");

-- CreateIndex: hand-written partial unique index — a user can never have more than one open
-- (offlineAt IS NULL) session at a time. Prisma's schema DSL can't express partial indexes,
-- so this exists only here; see the AttendanceSession doc comment in schema.prisma.
CREATE UNIQUE INDEX "attendance_sessions_open_userId_key" ON "attendance_sessions"("userId") WHERE "offlineAt" IS NULL;
