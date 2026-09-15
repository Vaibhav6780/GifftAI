import type { Prisma } from "@prisma/client";
import type { ExportAttendanceRequestsQuery, ListAttendanceRequestsQuery } from "@gifftai/shared";
import { prisma } from "../../config/prisma";
import { dateOnlyToUtcMidnight } from "../../lib/dateOnly";

const requestWithUsers = {
  user: { select: { id: true, firstName: true, lastName: true } },
  reviewedBy: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.AttendanceRequestInclude;

export type AttendanceRequestWithUsers = Prisma.AttendanceRequestGetPayload<{
  include: typeof requestWithUsers;
}>;

function buildListWhere(
  query: Pick<ListAttendanceRequestsQuery, "userId" | "status" | "from" | "to">,
): Prisma.AttendanceRequestWhereInput {
  return {
    ...(query.userId ? { userId: query.userId } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.from || query.to
      ? {
          date: {
            ...(query.from ? { gte: dateOnlyToUtcMidnight(query.from) } : {}),
            ...(query.to ? { lte: dateOnlyToUtcMidnight(query.to) } : {}),
          },
        }
      : {}),
  };
}

export const attendanceRequestsRepository = {
  findByUserAndDate(userId: string, dateOnly: string): Promise<AttendanceRequestWithUsers | null> {
    return prisma.attendanceRequest.findUnique({
      where: { userId_date: { userId, date: dateOnlyToUtcMidnight(dateOnly) } },
      include: requestWithUsers,
    });
  },

  findById(id: string): Promise<AttendanceRequestWithUsers | null> {
    return prisma.attendanceRequest.findUnique({ where: { id }, include: requestWithUsers });
  },

  create(data: {
    userId: string;
    date: string;
    type: Prisma.AttendanceRequestCreateInput["type"];
    reason?: string;
  }): Promise<AttendanceRequestWithUsers> {
    return prisma.attendanceRequest.create({
      data: { userId: data.userId, date: dateOnlyToUtcMidnight(data.date), type: data.type, reason: data.reason },
      include: requestWithUsers,
    });
  },

  review(
    id: string,
    data: {
      status: Prisma.AttendanceRequestUpdateInput["status"];
      reviewedById: string;
      reviewNote?: string;
    },
  ): Promise<AttendanceRequestWithUsers> {
    return prisma.attendanceRequest.update({
      where: { id },
      data: {
        status: data.status,
        reviewedById: data.reviewedById,
        reviewedAt: new Date(),
        reviewNote: data.reviewNote,
      },
      include: requestWithUsers,
    });
  },

  async listOwn(
    userId: string,
    query: { page: number; pageSize: number },
  ): Promise<{ items: AttendanceRequestWithUsers[]; total: number }> {
    const where: Prisma.AttendanceRequestWhereInput = { userId };
    const [items, total] = await Promise.all([
      prisma.attendanceRequest.findMany({
        where,
        include: requestWithUsers,
        orderBy: { date: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.attendanceRequest.count({ where }),
    ]);
    return { items, total };
  },

  async list(
    query: ListAttendanceRequestsQuery,
  ): Promise<{ items: AttendanceRequestWithUsers[]; total: number }> {
    const where = buildListWhere(query);

    const [items, total] = await Promise.all([
      prisma.attendanceRequest.findMany({
        where,
        include: requestWithUsers,
        orderBy: { date: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.attendanceRequest.count({ where }),
    ]);

    return { items, total };
  },

  /** Same filters as `list`, but unpaginated — used for exports. */
  listAll(query: ExportAttendanceRequestsQuery): Promise<AttendanceRequestWithUsers[]> {
    return prisma.attendanceRequest.findMany({
      where: buildListWhere(query),
      include: requestWithUsers,
      orderBy: { date: "desc" },
    });
  },
};
