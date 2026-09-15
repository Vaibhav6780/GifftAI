import { Prisma } from "@prisma/client";
import { combineIstTime, computeOvertimeMinutes, getOvertimeCutoff, isHalfDayLogin, isPastOvertimeCutoff } from "@gifftai/shared";
import type {
  AttendanceSessionSummary,
  CurrentAttendanceStatus,
  ExportAttendanceQuery,
  ListAttendanceQuery,
  PaginatedResult,
} from "@gifftai/shared";
import { attendanceRepository, type AttendanceSessionWithUser } from "./attendance.repository";
import type { RequestMeta } from "../../lib/requestMeta";
import { env } from "../../config/env";
import { AppError } from "../../lib/apiError";
import { writeAuditLog } from "../../lib/auditLog";

function toSummary(session: AttendanceSessionWithUser): AttendanceSessionSummary {
  return {
    id: session.id,
    userId: session.userId,
    userName: `${session.user.firstName} ${session.user.lastName}`,
    date: session.onlineAt.toISOString().slice(0, 10),
    onlineAt: session.onlineAt.toISOString(),
    offlineAt: session.offlineAt?.toISOString() ?? null,
    ip: session.ip,
    location: session.location,
    status: session.offlineAt ? "OFFLINE" : "ONLINE",
    halfDay: isHalfDayLogin(session.onlineAt),
    overtimeMinutes: computeOvertimeMinutes(session.onlineAt, session.offlineAt),
    extendedExitTime: session.extendedExitTime?.toISOString() ?? null,
  };
}

export const attendanceService = {
  async list(query: ListAttendanceQuery): Promise<PaginatedResult<AttendanceSessionSummary>> {
    const { items, total } = await attendanceRepository.list(query);

    return {
      items: items.map(toSummary),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    };
  },

  async exportList(query: ExportAttendanceQuery): Promise<AttendanceSessionSummary[]> {
    const items = await attendanceRepository.listAll(query);
    return items.map(toSummary);
  },

  async me(userId: string): Promise<CurrentAttendanceStatus> {
    const session = await attendanceRepository.findOpenSession(userId);
    if (!session) {
      return { status: "OFFLINE", location: null, onlineAt: null, extendedExitTime: null, overtimeExtensionTime: env.OVERTIME_EXTENSION_TIME };
    }
    return {
      status: "ONLINE",
      location: session.location,
      onlineAt: session.onlineAt.toISOString(),
      extendedExitTime: session.extendedExitTime?.toISOString() ?? null,
      overtimeExtensionTime: env.OVERTIME_EXTENSION_TIME,
    };
  },

  /** Idempotent: a user clicking Online while already online (double-click, a second tab,
   *  a retried request) never creates a duplicate row — it just returns the session that's
   *  already open. The hard guarantee is the DB's partial unique index; the pre-check here
   *  just avoids hitting that constraint (and its error) on the common path. */
  async goOnline(userId: string, meta: RequestMeta): Promise<CurrentAttendanceStatus> {
    const existing = await attendanceRepository.findOpenSession(userId);
    if (existing) {
      return {
        status: "ONLINE",
        location: existing.location,
        onlineAt: existing.onlineAt.toISOString(),
        extendedExitTime: existing.extendedExitTime?.toISOString() ?? null,
        overtimeExtensionTime: env.OVERTIME_EXTENSION_TIME,
      };
    }

    const location = meta.ipAddress && env.OFFICE_PUBLIC_IPS.includes(meta.ipAddress) ? "OFFICE" : "REMOTE";

    try {
      const session = await attendanceRepository.createOpenSession(userId, location, meta.ipAddress);
      return {
        status: "ONLINE",
        location: session.location,
        onlineAt: session.onlineAt.toISOString(),
        extendedExitTime: null,
        overtimeExtensionTime: env.OVERTIME_EXTENSION_TIME,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const raced = await attendanceRepository.findOpenSession(userId);
        if (raced) {
          return {
            status: "ONLINE",
            location: raced.location,
            onlineAt: raced.onlineAt.toISOString(),
            extendedExitTime: raced.extendedExitTime?.toISOString() ?? null,
            overtimeExtensionTime: env.OVERTIME_EXTENSION_TIME,
          };
        }
      }
      throw error;
    }
  },

  async goOffline(userId: string): Promise<CurrentAttendanceStatus> {
    const existing = await attendanceRepository.findOpenSession(userId);
    if (!existing) {
      return { status: "OFFLINE", location: null, onlineAt: null, extendedExitTime: null, overtimeExtensionTime: env.OVERTIME_EXTENSION_TIME };
    }

    await attendanceRepository.closeSession(existing.id);
    return { status: "OFFLINE", location: null, onlineAt: null, extendedExitTime: null, overtimeExtensionTime: env.OVERTIME_EXTENSION_TIME };
  },

  /** One-time "Extend Hours" / Overtime Extension. Normal exit is 6:30 PM; if an employee is
   *  still working past that, they can request an extension to the fixed, admin-configured
   *  exit time (`env.OVERTIME_EXTENSION_TIME`, e.g. 8:00 PM) — but only from the office
   *  network, and only once per open session (attendance day). The extension time is never
   *  taken from the request — always the server's own config — same reasoning as the IP
   *  check below: nothing about approval is trusted from the client. None of this touches
   *  `offlineAt` — the real logout time is untouched and overtime is still computed from it,
   *  not from `extendedExitTime`, which is purely the approved/audited exit time. Every rule
   *  here is enforced server-side against DB/request state (open session, stored
   *  extendedExitTime, req.ip) — a client can't bypass any of it by lying about time-of-day,
   *  session state, or IP. */
  async extendOvertime(userId: string, meta: RequestMeta): Promise<CurrentAttendanceStatus> {
    const session = await attendanceRepository.findOpenSession(userId);
    if (!session) {
      throw AppError.badRequest("You must be online to request an hours extension");
    }
    // Mirrors the frontend's own button-visibility gate (useOvertimeCutoffTick), but
    // enforced here too -- the frontend check is just UX, not a security boundary.
    if (!isPastOvertimeCutoff()) {
      throw AppError.badRequest("Hours can only be extended after 6:30 PM");
    }
    if (session.extendedExitTime) {
      throw AppError.conflict("Hours have already been extended for this attendance session");
    }
    if (!meta.ipAddress || !env.OFFICE_PUBLIC_IPS.includes(meta.ipAddress)) {
      throw AppError.forbidden("Extension is only available from the office network");
    }

    const extendedExitTime = combineIstTime(session.onlineAt, env.OVERTIME_EXTENSION_TIME);
    if (extendedExitTime.getTime() <= getOvertimeCutoff(session.onlineAt).getTime()) {
      // Only reachable via a misconfigured OVERTIME_EXTENSION_TIME (set at/before 18:30) —
      // never a normal user-triggered path, since the time isn't client-supplied anymore.
      throw AppError.badRequest("Configured extension time must be after 6:30 PM");
    }

    const updated = await attendanceRepository.setExtendedExitTime(session.id, extendedExitTime);

    await writeAuditLog({
      userId,
      action: "attendance.overtime_extend",
      entityType: "AttendanceSession",
      entityId: session.id,
      newValue: { extendedExitTime: extendedExitTime.toISOString() },
      ...meta,
    });

    return {
      status: "ONLINE",
      location: updated.location,
      onlineAt: updated.onlineAt.toISOString(),
      extendedExitTime: updated.extendedExitTime!.toISOString(),
      overtimeExtensionTime: env.OVERTIME_EXTENSION_TIME,
    };
  },

  /** Called from auth.service.ts's logout. Office sessions are entry/exit-only and stay
   *  open until an explicit Offline click; only a Remote session is auto-closed here, since
   *  there's no heartbeat to otherwise notice a Remote employee went offline. */
  async autoCloseIfRemote(userId: string): Promise<void> {
    const existing = await attendanceRepository.findOpenSession(userId);
    if (existing && existing.location === "REMOTE") {
      await attendanceRepository.closeSession(existing.id);
    }
  },

  /**
   * Automatic 6:30 PM IST cutoff, run periodically by attendanceCutoff.processor.ts (see
   * jobs/queues/attendanceCutoff.queue.ts) so a session can never sit "Online" indefinitely
   * past 6:30 PM without a valid Overtime Extension — the sole enforcement the Extension
   * feature itself relies on to mean anything (extendOvertime above already guarantees a
   * session can only ever acquire `extendedExitTime` once, from the office network, before
   * the caller requests a time after the cutoff; none of that is touched here).
   *
   * Every still-open, never-extended session gets `offlineAt` stamped at exactly *its own*
   * 6:30 PM cutoff instant (its onlineAt's IST calendar day, not "now" the job happens to be
   * running) the first time this notices it's overdue — so computeOvertimeMinutes(onlineAt,
   * offlineAt) comes out to exactly 0 for it, matching "no extension -> no overtime",
   * regardless of how many minutes late this job actually catches it. A session that *did*
   * request an extension is filtered out entirely by the repository call below and left
   * running untouched — computeOvertimeMinutes already correctly counts only the minutes
   * after 6:30 PM once the employee's real Go Offline click eventually sets offlineAt, so no
   * separate overtime calculation is needed for that path either.
   */
  async enforceAutomaticCutoff(): Promise<{ closedCount: number }> {
    const openSessions = await attendanceRepository.findOpenSessionsWithoutExtension();
    const now = Date.now();

    // `cutoff > onlineAt` guards a rare but real edge case: someone clocking in after 6:30 PM
    // (a late login with no earlier session that day) would otherwise have that same day's
    // cutoff be *before* their own onlineAt — closing them there would write offlineAt <
    // onlineAt, an invalid negative-duration session. Such sessions are left running instead;
    // they started already past the cutoff, so there was no "normal shift" to cut off.
    const due = openSessions.filter((session) => {
      const cutoff = getOvertimeCutoff(session.onlineAt);
      return cutoff.getTime() > session.onlineAt.getTime() && now >= cutoff.getTime();
    });

    for (const session of due) {
      const cutoff = getOvertimeCutoff(session.onlineAt);
      await attendanceRepository.closeSessionAt(session.id, cutoff);
      await writeAuditLog({
        userId: session.userId,
        action: "attendance.auto_cutoff",
        entityType: "AttendanceSession",
        entityId: session.id,
        newValue: { offlineAt: cutoff.toISOString() },
      });
    }

    return { closedCount: due.length };
  },
};
