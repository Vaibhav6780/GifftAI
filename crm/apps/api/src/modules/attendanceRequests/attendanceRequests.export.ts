import ExcelJS from "exceljs";
import type { AttendanceRequestSummary } from "@gifftai/shared";

export async function buildAttendanceRequestsWorkbook(requests: AttendanceRequestSummary[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("WFH-Leave Requests");

  sheet.columns = [
    { header: "Employee", key: "userName", width: 24 },
    { header: "Date", key: "date", width: 14 },
    { header: "Type", key: "type", width: 16 },
    { header: "Reason", key: "reason", width: 40 },
    { header: "Status", key: "status", width: 12 },
    { header: "Reviewed By", key: "reviewedByName", width: 24 },
    { header: "Reviewed At", key: "reviewedAt", width: 20 },
    { header: "Review Note", key: "reviewNote", width: 40 },
    { header: "Submitted At", key: "createdAt", width: 20 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const request of requests) {
    sheet.addRow({
      userName: request.userName,
      date: request.date,
      type: request.type === "WORK_FROM_HOME" ? "Work From Home" : "Leave",
      reason: request.reason ?? "",
      status: request.status,
      reviewedByName: request.reviewedByName ?? "",
      reviewedAt: request.reviewedAt ? new Date(request.reviewedAt).toLocaleString() : "",
      reviewNote: request.reviewNote ?? "",
      createdAt: new Date(request.createdAt).toLocaleString(),
    });
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
