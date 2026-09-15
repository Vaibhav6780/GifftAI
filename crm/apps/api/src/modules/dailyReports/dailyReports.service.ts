import type {
  DailyReportSummary,
  ListDailyReportsQuery,
  ListMyDailyReportsQuery,
  PaginatedResult,
  SubmitDailyReportInput,
} from "@gifftai/shared";
import { dailyReportsRepository, type DailyReportWithUser } from "./dailyReports.repository";
import { writeAuditLog } from "../../lib/auditLog";
import { todayDateOnly } from "../../lib/dateOnly";
import type { RequestMeta } from "../../lib/requestMeta";

function toSummary(report: DailyReportWithUser): DailyReportSummary {
  return {
    id: report.id,
    userId: report.userId,
    userName: `${report.user.firstName} ${report.user.lastName}`,
    date: report.date.toISOString().slice(0, 10),
    summary: report.summary,
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
  };
}

function paginate<T>(
  { items, total }: { items: T[]; total: number },
  page: number,
  pageSize: number,
): PaginatedResult<T> {
  return { items, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export const dailyReportsService = {
  /** Submits (or, if one already exists for today, revises) the calling user's Day Report —
   *  always for today, same "no future/past picker" convention as AttendanceRequest. */
  async submitToday(userId: string, input: SubmitDailyReportInput, meta: RequestMeta): Promise<DailyReportSummary> {
    const date = todayDateOnly();
    const existed = Boolean(await dailyReportsRepository.findByUserAndDate(userId, date));

    const report = await dailyReportsRepository.upsertToday(userId, date, input.summary);

    await writeAuditLog({
      userId,
      action: existed ? "daily_report.update" : "daily_report.create",
      entityType: "DailyReport",
      entityId: report.id,
      newValue: { date, summary: input.summary },
      ...meta,
    });

    return toSummary(report);
  },

  async listOwn(userId: string, query: ListMyDailyReportsQuery): Promise<PaginatedResult<DailyReportSummary>> {
    const result = await dailyReportsRepository.listOwn(userId, query);
    return paginate({ items: result.items.map(toSummary), total: result.total }, query.page, query.pageSize);
  },

  async list(query: ListDailyReportsQuery): Promise<PaginatedResult<DailyReportSummary>> {
    const result = await dailyReportsRepository.list(query);
    return paginate({ items: result.items.map(toSummary), total: result.total }, query.page, query.pageSize);
  },
};
