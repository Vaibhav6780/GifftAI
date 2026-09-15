import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  DailyReportSummary,
  ListDailyReportsQuery,
  ListMyDailyReportsQuery,
  PaginatedResult,
  SubmitDailyReportInput,
} from "@gifftai/shared";
import { apiClient } from "../../lib/apiClient";
import { unwrap } from "../../lib/unwrap";

const MY_LIST_KEY = ["daily-reports", "me"] as const;
const ALL_LIST_KEY = ["daily-reports", "all"] as const;

export function useMyDailyReports(query: Partial<ListMyDailyReportsQuery> = {}) {
  return useQuery({
    queryKey: [...MY_LIST_KEY, query],
    queryFn: () => unwrap<PaginatedResult<DailyReportSummary>>(apiClient.get("/daily-reports/me", { params: query })),
  });
}

export function useSubmitDailyReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SubmitDailyReportInput) =>
      unwrap<DailyReportSummary>(apiClient.put("/daily-reports/today", input)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MY_LIST_KEY }),
  });
}

export function useAllDailyReports(query: Partial<ListDailyReportsQuery>) {
  return useQuery({
    queryKey: [...ALL_LIST_KEY, query],
    queryFn: () => unwrap<PaginatedResult<DailyReportSummary>>(apiClient.get("/daily-reports", { params: query })),
  });
}
