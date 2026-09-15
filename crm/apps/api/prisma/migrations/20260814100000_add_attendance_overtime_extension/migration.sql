-- AlterTable: one-time Overtime Extension. Null until an employee successfully extends past
-- the 6:30 PM cutoff from the office network; non-null doubles as the one-time-use guard.
ALTER TABLE "attendance_sessions" ADD COLUMN "extendedExitTime" TIMESTAMP(3);
