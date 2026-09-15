import {
  isBeforeAttendanceRequestCutoff,
  type AttendanceRequestSummary,
  type CreateAttendanceRequestInput,
  type ExportAttendanceRequestsQuery,
  type ListAttendanceRequestsQuery,
  type ListMyAttendanceRequestsQuery,
  type PaginatedResult,
  type ReviewAttendanceRequestInput,
} from "@gifftai/shared";
import {
  attendanceRequestsRepository,
  type AttendanceRequestWithUsers,
} from "./attendanceRequests.repository";
import { AppError } from "../../lib/apiError";
import { writeAuditLog } from "../../lib/auditLog";
import { todayDateOnly } from "../../lib/dateOnly";
import type { RequestMeta } from "../../lib/requestMeta";

function toSummary(request: AttendanceRequestWithUsers): AttendanceRequestSummary {
  return {
    id: request.id,
    userId: request.userId,
    userName: `${request.user.firstName} ${request.user.lastName}`,
    date: request.date.toISOString().slice(0, 10),
    type: request.type,
    reason: request.reason,
    status: request.status,
    reviewedById: request.reviewedById,
    reviewedByName: request.reviewedBy ? `${request.reviewedBy.firstName} ${request.reviewedBy.lastName}` : null,
    reviewedAt: request.reviewedAt?.toISOString() ?? null,
    reviewNote: request.reviewNote,
    createdAt: request.createdAt.toISOString(),
  };
}

function paginate<T>(
  { items, total }: { items: T[]; total: number },
  page: number,
  pageSize: number,
): PaginatedResult<T> {
  return { items, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export const attendanceRequestsService = {
  /** Submits today's WFH/Leave request for the calling user — one per day, only before the
   *  9:45 AM cutoff. There's no "pick a future date" here: the request is always for today,
   *  same as how the attendance/heartbeat system it feeds is always about the current day. */
  async create(
    userId: string,
    input: CreateAttendanceRequestInput,
    meta: RequestMeta,
  ): Promise<AttendanceRequestSummary> {
    if (!isBeforeAttendanceRequestCutoff()) {
      throw AppError.badRequest("Attendance requests must be submitted before 9:45 AM");
    }

    const date = todayDateOnly();
    const existing = await attendanceRequestsRepository.findByUserAndDate(userId, date);
    if (existing) {
      throw AppError.conflict("You've already submitted an attendance request for today");
    }

    const request = await attendanceRequestsRepository.create({
      userId,
      date,
      type: input.type,
      reason: input.reason,
    });

    await writeAuditLog({
      userId,
      action: "attendance_request.create",
      entityType: "AttendanceRequest",
      entityId: request.id,
      newValue: { type: input.type, date },
      ...meta,
    });

    return toSummary(request);
  },

  async listOwn(
    userId: string,
    query: ListMyAttendanceRequestsQuery,
  ): Promise<PaginatedResult<AttendanceRequestSummary>> {
    const result = await attendanceRequestsRepository.listOwn(userId, query);
    return paginate({ items: result.items.map(toSummary), total: result.total }, query.page, query.pageSize);
  },

  async list(query: ListAttendanceRequestsQuery): Promise<PaginatedResult<AttendanceRequestSummary>> {
    const result = await attendanceRequestsRepository.list(query);
    return paginate({ items: result.items.map(toSummary), total: result.total }, query.page, query.pageSize);
  },

  async exportList(query: ExportAttendanceRequestsQuery): Promise<AttendanceRequestSummary[]> {
    const items = await attendanceRequestsRepository.listAll(query);
    return items.map(toSummary);
  },

  async review(
    id: string,
    actorId: string,
    input: ReviewAttendanceRequestInput,
    meta: RequestMeta,
  ): Promise<AttendanceRequestSummary> {
    const existing = await attendanceRequestsRepository.findById(id);
    if (!existing) throw AppError.notFound("Attendance request not found");
    if (existing.status !== "PENDING") {
      throw AppError.badRequest("This request has already been reviewed");
    }

    const reviewed = await attendanceRequestsRepository.review(id, {
      status: input.status,
      reviewedById: actorId,
      reviewNote: input.reviewNote,
    });

    await writeAuditLog({
      userId: actorId,
      action: "attendance_request.review",
      entityType: "AttendanceRequest",
      entityId: id,
      oldValue: { status: existing.status },
      newValue: { status: input.status, reviewNote: input.reviewNote ?? null },
      ...meta,
    });

    return toSummary(reviewed);
  },
};
