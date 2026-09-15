const CUTOFF_HOUR = 9;
const CUTOFF_MINUTE = 45;

/** WFH/Leave requests must be submitted before 9:45 AM local time on the day they're for.
 *  Shared by the API (authoritative enforcement, server-local time) and the web app (early
 *  UX feedback, browser-local time) so the two never disagree about where the line is. */
export function isBeforeAttendanceRequestCutoff(now: Date = new Date()): boolean {
  const hours = now.getHours();
  const minutes = now.getMinutes();
  return hours < CUTOFF_HOUR || (hours === CUTOFF_HOUR && minutes < CUTOFF_MINUTE);
}
