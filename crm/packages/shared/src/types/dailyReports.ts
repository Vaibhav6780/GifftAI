export interface DailyReportSummary {
  id: string;
  userId: string;
  userName: string;
  /** YYYY-MM-DD — the single day this report is for. */
  date: string;
  summary: string;
  createdAt: string;
  updatedAt: string;
}
