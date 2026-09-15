export type AttendanceStatus = "ONLINE" | "OFFLINE";
export type AttendanceLocation = "OFFICE" | "REMOTE";

export interface AttendanceSessionSummary {
  id: string;
  userId: string;
  userName: string;
  /** YYYY-MM-DD, derived from onlineAt. */
  date: string;
  onlineAt: string;
  offlineAt: string | null;
  ip: string | null;
  location: AttendanceLocation;
  status: AttendanceStatus;
  /** True when onlineAt is after 10:30 AM IST — see lib/halfDay.ts. */
  halfDay: boolean;
  /** Minutes of the session after 6:30 PM IST — see lib/overtime.ts. */
  overtimeMinutes: number;
  /** The approved exit time from a one-time Overtime Extension ("Extend Hours" button, see
   *  POST /attendance/extend-overtime), or null if never used this session. Purely
   *  informational — `offlineAt` above always holds the real logout time regardless of this
   *  value. */
  extendedExitTime: string | null;
}

/** The caller's own current session, for the Online/Offline toggle. `location`/`onlineAt`/
 *  `extendedExitTime` are null when there's no open session (status is OFFLINE). */
export interface CurrentAttendanceStatus {
  status: AttendanceStatus;
  location: AttendanceLocation | null;
  onlineAt: string | null;
  /** Set once the employee has used their one-time Overtime Extension ("Extend Hours"
   *  button) for the current open session — see POST /attendance/extend-overtime. Non-null
   *  here means the button should no longer be offered. */
  extendedExitTime: string | null;
  /** The fixed, admin-configured "HH:mm" (IST) time "Extend Hours" extends to
   *  (`OVERTIME_EXTENSION_TIME` env var) — always present regardless of session/extension
   *  state, so the frontend can say what time it'll extend to before the button is clicked. */
  overtimeExtensionTime: string;
}
