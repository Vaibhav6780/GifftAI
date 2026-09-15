const OVERTIME_HOUR_IST = 18;
const OVERTIME_MINUTE_IST = 30;
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

/** 6:30 PM IST on `referenceDate`'s own IST calendar day, expressed back as a real UTC
 *  instant — shared by computeOvertimeMinutes, isPastOvertimeCutoff, and the Overtime
 *  Extension feature's server-side validation, so all three agree on exactly the same
 *  cutoff instant. */
function overtimeCutoffForDay(referenceDate: Date): Date {
  const referenceIst = new Date(referenceDate.getTime() + IST_OFFSET_MS);
  const cutoffIstShifted = Date.UTC(
    referenceIst.getUTCFullYear(),
    referenceIst.getUTCMonth(),
    referenceIst.getUTCDate(),
    OVERTIME_HOUR_IST,
    OVERTIME_MINUTE_IST,
  );
  return new Date(cutoffIstShifted - IST_OFFSET_MS);
}

/**
 * Minutes of a session that fall after 6:30 PM India Standard Time (UTC+5:30, fixed — same
 * explicit-offset approach as isHalfDayLogin, for the same reason: this must give the same
 * answer regardless of what timezone the server or browser happen to run in).
 *
 * Only the portion of the session past the cutoff counts — a session from 9 AM to 7 PM
 * contributes 30 minutes, not the whole day. `now` defaults to the current time so a still-
 * open session (offlineAt null) reports a live, growing value, same as `status` in
 * attendance.service.ts's toSummary().
 */
export function computeOvertimeMinutes(
  onlineAt: Date | string,
  offlineAt: Date | string | null,
  now: Date = new Date(),
): number {
  const start = typeof onlineAt === "string" ? new Date(onlineAt) : onlineAt;
  const end = offlineAt ? (typeof offlineAt === "string" ? new Date(offlineAt) : offlineAt) : now;

  const cutoffMs = overtimeCutoffForDay(start).getTime();
  const overtimeStartMs = Math.max(start.getTime(), cutoffMs);
  const overtimeMs = end.getTime() - overtimeStartMs;
  return overtimeMs > 0 ? Math.round(overtimeMs / 60_000) : 0;
}

/** True once `now` is past 6:30 PM on its own IST calendar day — gates when the frontend's
 *  "Extend Overtime" button appears (see AttendanceToggle.tsx) and, independently, whether
 *  the backend accepts an extension request (attendance.service.ts's extendOvertime). */
export function isPastOvertimeCutoff(now: Date = new Date()): boolean {
  return now.getTime() > overtimeCutoffForDay(now).getTime();
}

/** Combines an "HH:mm" wall-clock time (as picked in the Extend Overtime dialog) with
 *  `referenceDate`'s own IST calendar day, returning the real UTC instant that represents.
 *  Used only server-side (attendance.service.ts) to turn the employee's chosen extended
 *  exit time into a storable `Date` — same explicit-offset approach as the rest of this
 *  file, so it agrees with overtimeCutoffForDay regardless of server timezone. */
export function combineIstTime(referenceDate: Date, hhmm: string): Date {
  const [hours, minutes] = hhmm.split(":").map(Number) as [number, number];
  const referenceIst = new Date(referenceDate.getTime() + IST_OFFSET_MS);
  const combinedIstShifted = Date.UTC(
    referenceIst.getUTCFullYear(),
    referenceIst.getUTCMonth(),
    referenceIst.getUTCDate(),
    hours,
    minutes,
  );
  return new Date(combinedIstShifted - IST_OFFSET_MS);
}

/** The 6:30 PM IST cutoff instant for `referenceDate`'s own IST calendar day — exported so
 *  attendance.service.ts can validate a chosen extension time falls after it. */
export function getOvertimeCutoff(referenceDate: Date): Date {
  return overtimeCutoffForDay(referenceDate);
}

/** "1h 30m" / "45m" / "2h" / "—" for zero — shared by the Attendance page table and the
 *  Excel export so the two never disagree on formatting. */
export function formatOvertimeMinutes(minutes: number): string {
  if (minutes <= 0) return "—";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}
