const HALF_DAY_HOUR_IST = 10;
const HALF_DAY_MINUTE_IST = 30;
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

/** True when `onlineAt` falls after 10:30 AM India Standard Time (UTC+5:30, fixed — IST has
 *  no DST, so no timezone-database lookup is needed). Computed via an explicit offset rather
 *  than Date.getHours()/getMinutes() (contrast attendanceRequestCutoff.ts), which would
 *  reflect whatever timezone the runtime itself is in — server-local in the API container
 *  (UTC in production, confirmed 2026-08), browser-local on the web. This needs to give the
 *  same answer regardless of where it runs. */
export function isHalfDayLogin(onlineAt: Date | string): boolean {
  const date = typeof onlineAt === "string" ? new Date(onlineAt) : onlineAt;
  const ist = new Date(date.getTime() + IST_OFFSET_MS);
  const hours = ist.getUTCHours();
  const minutes = ist.getUTCMinutes();
  return hours > HALF_DAY_HOUR_IST || (hours === HALF_DAY_HOUR_IST && minutes > HALF_DAY_MINUTE_IST);
}
