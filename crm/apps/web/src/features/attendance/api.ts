import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AttendanceSessionSummary,
  CurrentAttendanceStatus,
  ExportAttendanceQuery,
  ListAttendanceQuery,
  PaginatedResult,
} from "@gifftai/shared";
import { apiClient } from "../../lib/apiClient";
import { unwrap } from "../../lib/unwrap";

const ME_QUERY_KEY = ["attendance", "me"] as const;

export function useAttendanceList(query: Partial<ListAttendanceQuery>) {
  return useQuery({
    queryKey: ["attendance", query] as const,
    queryFn: () =>
      unwrap<PaginatedResult<AttendanceSessionSummary>>(apiClient.get("/attendance", { params: query })),
    // Online/Offline is set explicitly by each employee, but other employees' clicks still
    // land while this page is open — poll so it reflects reality without a manual refresh.
    refetchInterval: 30_000,
  });
}

export function useExportAttendance() {
  return useMutation({
    mutationFn: async (query: Partial<ExportAttendanceQuery>) => {
      const response = await apiClient.get("/attendance/export", { params: query, responseType: "blob" });
      return response.data as Blob;
    },
  });
}

export function useMyAttendanceStatus() {
  return useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: () => unwrap<CurrentAttendanceStatus>(apiClient.get("/attendance/me")),
  });
}

export function useGoOnline() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => unwrap<CurrentAttendanceStatus>(apiClient.post("/attendance/online")),
    onSuccess: (status) => queryClient.setQueryData(ME_QUERY_KEY, status),
  });
}

export function useGoOffline() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => unwrap<CurrentAttendanceStatus>(apiClient.post("/attendance/offline")),
    onSuccess: (status) => queryClient.setQueryData(ME_QUERY_KEY, status),
  });
}

export function useExtendOvertime() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => unwrap<CurrentAttendanceStatus>(apiClient.post("/attendance/extend-overtime")),
    onSuccess: (status) => queryClient.setQueryData(ME_QUERY_KEY, status),
  });
}
