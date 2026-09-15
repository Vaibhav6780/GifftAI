import { useQuery } from "@tanstack/react-query";
import type { DashboardSummary } from "@gifftai/shared";
import { apiClient } from "../../lib/apiClient";
import { unwrap } from "../../lib/unwrap";

export const DASHBOARD_KEY = ["dashboard"] as const;

export function useDashboardSummary() {
  return useQuery({
    queryKey: DASHBOARD_KEY,
    queryFn: () => unwrap<DashboardSummary>(apiClient.get("/dashboard/summary")),
  });
}
