import type { LeadStatus, LeadSummary } from "./leads.js";

export interface DashboardStatusCount {
  status: LeadStatus;
  count: number;
}

export interface DashboardSourceCount {
  sourceId: string | null;
  sourceName: string;
  count: number;
}

export interface DashboardSummary {
  totalLeads: number;
  countsByStatus: DashboardStatusCount[];
  countsBySource: DashboardSourceCount[];
  recentLeads: LeadSummary[];
  myAssignedLeads: LeadSummary[];
  myAssignedCount: number;
}
