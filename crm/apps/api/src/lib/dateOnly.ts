/** Today's date as YYYY-MM-DD in the server's local timezone — deliberately local, not UTC,
 *  so it agrees with `isBeforeAttendanceRequestCutoff`'s use of local wall-clock hours. */
export function todayDateOnly(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Same UTC-midnight convention already used for date-only filtering in
 *  attendance.repository.ts, so date columns compare correctly regardless of representation. */
export function dateOnlyToUtcMidnight(dateOnly: string): Date {
  return new Date(`${dateOnly}T00:00:00.000Z`);
}
