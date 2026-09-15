import type { DashboardSummary, LeadStatus } from "@gifftai/shared";
import { dashboardRepository } from "./dashboard.repository";
import { leadsService } from "../leads/leads.service";

const ALL_STATUSES: LeadStatus[] = ["NEW", "HOT", "WARM", "COLD", "LOST"];
const RECENT_PAGE_SIZE = 5;

export const dashboardService = {
  async getSummary(userId: string): Promise<DashboardSummary> {
    const [statusRows, countsBySource, recent, mine] = await Promise.all([
      dashboardRepository.countsByStatus(),
      dashboardRepository.countsBySource(),
      leadsService.list({ page: 1, pageSize: RECENT_PAGE_SIZE, sortBy: "createdAt", sortOrder: "desc" }),
      leadsService.list({
        page: 1,
        pageSize: RECENT_PAGE_SIZE,
        sortBy: "createdAt",
        sortOrder: "desc",
        ownerId: userId,
      }),
    ]);

    const countByStatus = new Map(statusRows.map((row) => [row.status, row.count]));
    const countsByStatus = ALL_STATUSES.map((status) => ({ status, count: countByStatus.get(status) ?? 0 }));
    const totalLeads = countsByStatus.reduce((sum, row) => sum + row.count, 0);

    return {
      totalLeads,
      countsByStatus,
      countsBySource,
      recentLeads: recent.items,
      myAssignedLeads: mine.items,
      myAssignedCount: mine.total,
    };
  },
};
