import ExcelJS from "exceljs";
import type { LeadSummary } from "@gifftai/shared";

export async function buildLeadsWorkbook(leads: LeadSummary[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Leads");

  sheet.columns = [
    { header: "First Name", key: "firstName", width: 18 },
    { header: "Last Name", key: "lastName", width: 18 },
    { header: "Email", key: "email", width: 28 },
    { header: "Phone", key: "phone", width: 18 },
    { header: "Company", key: "company", width: 24 },
    { header: "Job Title", key: "jobTitle", width: 20 },
    { header: "Brand", key: "brand", width: 12 },
    { header: "Status", key: "status", width: 14 },
    { header: "Score", key: "score", width: 10 },
    { header: "Value", key: "value", width: 12 },
    { header: "Source", key: "sourceName", width: 18 },
    { header: "Owner", key: "ownerName", width: 20 },
    { header: "Needs Follow-up", key: "needsFollowup", width: 16 },
    { header: "Follow-up Date", key: "followupDate", width: 16 },
    { header: "Follow-up Time", key: "followupTime", width: 14 },
    { header: "Date Added", key: "createdAt", width: 16 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const lead of leads) {
    sheet.addRow({
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email ?? "",
      phone: lead.phone ?? "",
      company: lead.company ?? "",
      jobTitle: lead.jobTitle ?? "",
      brand: lead.brand,
      status: lead.status,
      score: lead.score,
      value: lead.value ?? "",
      sourceName: lead.sourceName ?? "",
      ownerName: lead.ownerName ?? "",
      needsFollowup: lead.needsFollowup ? "Yes" : "No",
      followupDate: lead.followupDate ? new Date(lead.followupDate).toLocaleDateString() : "",
      followupTime: lead.followupTime ?? "",
      createdAt: new Date(lead.createdAt).toLocaleDateString(),
    });
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
