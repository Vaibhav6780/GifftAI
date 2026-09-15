import type { Prisma, AttendanceLocation } from "@prisma/client";
import type { ExportAttendanceQuery, ListAttendanceQuery } from "@gifftai/shared";
import { prisma } from "../../config/prisma";

const sessionWithUser = {
  user: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.AttendanceSessionInclude;

export type AttendanceSessionWithUser = Prisma.AttendanceSessionGetPayload<{ include: typeof sessionWithUser }>;

function buildWhere(
  query: Pick<ListAttendanceQuery, "userId" | "from" | "to"> & { hideSuperAdmin?: boolean },
): Prisma.AttendanceSessionWhereInput {
  return {
    ...(query.userId ? { userId: query.userId } : {}),
    ...(query.from || query.to
      ? {
          onlineAt: {
            ...(query.from ? { gte: new Date(`${query.from}T00:00:00.000Z`) } : {}),
            ...(query.to ? { lte: new Date(`${query.to}T23:59:59.999Z`) } : {}),
          },
        }
      : {}),
    ...(query.hideSuperAdmin ? { user: { userRoles: { none: { role: { name: "Super Admin" } } } } } : {}),
  };
}

export const attendanceRepository = {
  async list(query: ListAttendanceQuery): Promise<{ items: AttendanceSessionWithUser[]; total: number }> {
    const where = buildWhere(query);

    const [items, total] = await Promise.all([
      prisma.attendanceSession.findMany({
        where,
        include: sessionWithUser,
        orderBy: { onlineAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.attendanceSession.count({ where }),
    ]);

    return { items, total };
  },

  /** Same filters as `list`, but unpaginated — used for exports. */
  listAll(query: ExportAttendanceQuery): Promise<AttendanceSessionWithUser[]> {
    return prisma.attendanceSession.findMany({
      where: buildWhere(query),
      include: sessionWithUser,
      orderBy: { onlineAt: "desc" },
    });
  },

  findOpenSession(userId: string) {
    return prisma.attendanceSession.findFirst({ where: { userId, offlineAt: null } });
  },

  /** Every currently-open session that never used its one-time Overtime Extension --
   *  candidates for the automatic 6:30 PM cutoff job. Extended sessions are excluded here
   *  (not filtered by the caller) since they must never be auto-closed, regardless of how
   *  long they've been open. */
  findOpenSessionsWithoutExtension() {
    return prisma.attendanceSession.findMany({ where: { offlineAt: null, extendedExitTime: null } });
  },

  /** May throw a Prisma P2002 unique-constraint error — the hand-written partial unique
   *  index (`attendance_sessions_open_userId_key`, see schema.prisma) rejects a second open
   *  session for the same user. Callers should catch that and treat it as "already online". */
  createOpenSession(userId: string, location: AttendanceLocation, ip: string | undefined) {
    return prisma.attendanceSession.create({ data: { userId, location, ip } });
  },

  closeSession(id: string) {
    return prisma.attendanceSession.update({ where: { id }, data: { offlineAt: new Date() } });
  },

  /** Same as `closeSession`, but with an explicit `offlineAt` rather than always "now" --
   *  used by the automatic 6:30 PM cutoff job, which must stamp the real cutoff instant
   *  (not whenever the job happened to run) so overtimeMinutes comes out to exactly 0 for a
   *  non-extended session. */
  closeSessionAt(id: string, offlineAt: Date) {
    return prisma.attendanceSession.update({ where: { id }, data: { offlineAt } });
  },

  setExtendedExitTime(id: string, extendedExitTime: Date) {
    return prisma.attendanceSession.update({ where: { id }, data: { extendedExitTime } });
  },
};
