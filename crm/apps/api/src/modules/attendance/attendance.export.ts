import ExcelJS from "exceljs";
import { formatOvertimeMinutes } from "@gifftai/shared";
import type { AttendanceSessionSummary } from "@gifftai/shared";

export async function buildAttendanceWorkbook(sessions: AttendanceSessionSummary[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Attendance");

  sheet.columns = [
    { header: "Employee", key: "userName", width: 24 },
    { header: "Date", key: "date", width: 14 },
    { header: "Online At", key: "onlineAt", width: 20 },
    { header: "Offline At", key: "offlineAt", width: 20 },
    { header: "IP", key: "ip", width: 16 },
    { header: "Location", key: "location", width: 12 },
    { header: "Status", key: "status", width: 10 },
    { header: "Half Day", key: "halfDay", width: 10 },
    { header: "Overtime", key: "overtime", width: 12 },
    { header: "Overtime Extended To", key: "extendedExitTime", width: 20 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const session of sessions) {
    sheet.addRow({
      userName: session.userName,
      date: session.date,
      onlineAt: new Date(session.onlineAt).toLocaleString(),
      offlineAt: session.offlineAt ? new Date(session.offlineAt).toLocaleString() : "",
      ip: session.ip ?? "",
      location: session.location,
      status: session.status,
      halfDay: session.halfDay ? "Yes" : "No",
      overtime: formatOvertimeMinutes(session.overtimeMinutes),
      extendedExitTime: session.extendedExitTime ? new Date(session.extendedExitTime).toLocaleTimeString() : "",
    });
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
