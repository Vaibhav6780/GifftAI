-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "followupDate" TIMESTAMP(3),
ADD COLUMN     "needsFollowup" BOOLEAN NOT NULL DEFAULT false;
