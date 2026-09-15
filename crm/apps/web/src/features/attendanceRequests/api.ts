import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AttendanceRequestSummary,
  CreateAttendanceRequestInput,
  ExportAttendanceRequestsQuery,
  ListAttendanceRequestsQuery,
  ListMyAttendanceRequestsQuery,
  PaginatedResult,
  ReviewAttendanceRequestInput,
} from "@gifftai/shared";
import { apiClient } from "../../lib/apiClient";
import { unwrap } from "../../lib/unwrap";

const MY_LIST_KEY = ["attendance-requests", "me"] as const;
const ALL_LIST_KEY = ["attendance-requests", "all"] as const;

export function useMyAttendanceRequests(query: Partial<ListMyAttendanceRequestsQuery> = {}) {
  return useQuery({
    queryKey: [...MY_LIST_KEY, query],
    queryFn: () =>
      unwrap<PaginatedResult<AttendanceRequestSummary>>(apiClient.get("/attendance-requests/me", { params: query })),
  });
}

export function useCreateAttendanceRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAttendanceRequestInput) =>
      unwrap<AttendanceRequestSummary>(apiClient.post("/attendance-requests", input)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MY_LIST_KEY }),
  });
}

export function useAttendanceRequestsList(query: Partial<ListAttendanceRequestsQuery>) {
  return useQuery({
    queryKey: [...ALL_LIST_KEY, query],
    queryFn: () =>
      unwrap<PaginatedResult<AttendanceRequestSummary>>(apiClient.get("/attendance-requests", { params: query })),
  });
}

export function useExportAttendanceRequests() {
  return useMutation({
    mutationFn: async (query: Partial<ExportAttendanceRequestsQuery>) => {
      const response = await apiClient.get("/attendance-requests/export", { params: query, responseType: "blob" });
      return response.data as Blob;
    },
  });
}

export function useReviewAttendanceRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ReviewAttendanceRequestInput }) =>
      unwrap<AttendanceRequestSummary>(apiClient.patch(`/attendance-requests/${id}/review`, input)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ALL_LIST_KEY }),
  });
}
