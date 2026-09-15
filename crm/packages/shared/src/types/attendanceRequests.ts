export type AttendanceRequestType = "WORK_FROM_HOME" | "LEAVE";
export type AttendanceRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface AttendanceRequestSummary {
  id: string;
  userId: string;
  userName: string;
  /** YYYY-MM-DD — the single day this request is for. */
  date: string;
  type: AttendanceRequestType;
  reason: string | null;
  status: AttendanceRequestStatus;
  reviewedById: string | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  createdAt: string;
}
