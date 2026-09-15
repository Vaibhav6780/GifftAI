import type { Prisma } from "@prisma/client";
import type { ListDailyReportsQuery } from "@gifftai/shared";
import { prisma } from "../../config/prisma";
import { dateOnlyToUtcMidnight } from "../../lib/dateOnly";

const reportWithUser = {
  user: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.DailyReportInclude;

export type DailyReportWithUser = Prisma.DailyReportGetPayload<{ include: typeof reportWithUser }>;

export const dailyReportsRepository = {
  findByUserAndDate(userId: string, dateOnly: string): Promise<DailyReportWithUser | null> {
    return prisma.dailyReport.findUnique({
      where: { userId_date: { userId, date: dateOnlyToUtcMidnight(dateOnly) } },
      include: reportWithUser,
    });
  },

  /** Creates today's report, or updates it in place if the caller already submitted one
   *  today — the unique (userId, date) key makes this a plain upsert. */
  upsertToday(userId: string, dateOnly: string, summary: string): Promise<DailyReportWithUser> {
    const date = dateOnlyToUtcMidnight(dateOnly);
    return prisma.dailyReport.upsert({
      where: { userId_date: { userId, date } },
      update: { summary },
      create: { userId, date, summary },
      include: reportWithUser,
    });
  },

  async listOwn(
    userId: string,
    query: { page: number; pageSize: number },
  ): Promise<{ items: DailyReportWithUser[]; total: number }> {
    const where: Prisma.DailyReportWhereInput = { userId };
    const [items, total] = await Promise.all([
      prisma.dailyReport.findMany({
        where,
        include: reportWithUser,
        orderBy: { date: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.dailyReport.count({ where }),
    ]);
    return { items, total };
  },

  async list(query: ListDailyReportsQuery): Promise<{ items: DailyReportWithUser[]; total: number }> {
    const where: Prisma.DailyReportWhereInput = {
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.from || query.to
        ? {
            date: {
              ...(query.from ? { gte: dateOnlyToUtcMidnight(query.from) } : {}),
              ...(query.to ? { lte: dateOnlyToUtcMidnight(query.to) } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.dailyReport.findMany({
        where,
        include: reportWithUser,
        orderBy: { date: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.dailyReport.count({ where }),
    ]);

    return { items, total };
  },
};
