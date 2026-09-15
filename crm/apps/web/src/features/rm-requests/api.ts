import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AssignRmUserInput,
  ListRmFundingRequestsQuery,
  ListRmManualRequestsQuery,
  RejectRmFundingRequestInput,
  RmEntry,
  RmFundingRequestSummary,
  RmManualRequestSummary,
  RmRequestsConnectionStatus,
  SetRmManualRequestStatusInput,
} from "@gifftai/shared";
import { apiClient } from "../../lib/apiClient";
import { unwrap } from "../../lib/unwrap";

const FUNDING_KEY = ["rm-requests", "funding"] as const;
const MANUAL_KEY = ["rm-requests", "manual"] as const;
const RMS_KEY = ["rm-requests", "rms"] as const;

export function useRmRequestsStatus() {
  return useQuery({
    queryKey: ["rm-requests", "status"],
    queryFn: () => unwrap<RmRequestsConnectionStatus>(apiClient.get("/rm-requests/status")),
  });
}

export function useRmFundingRequests(query: ListRmFundingRequestsQuery) {
  return useQuery({
    queryKey: [...FUNDING_KEY, query],
    queryFn: () =>
      unwrap<RmFundingRequestSummary[]>(apiClient.get("/rm-requests/funding", { params: query })),
  });
}

export function useApproveRmFundingRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unwrap(apiClient.post(`/rm-requests/funding/${id}/approve`)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: FUNDING_KEY }),
  });
}

export function useCreditRmFundingRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unwrap(apiClient.post(`/rm-requests/funding/${id}/credit`)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: FUNDING_KEY }),
  });
}

export function useRejectRmFundingRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string } & RejectRmFundingRequestInput) =>
      unwrap(apiClient.post(`/rm-requests/funding/${id}/reject`, { reason })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: FUNDING_KEY }),
  });
}

export function useViewRmFundingProof() {
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.get(`/rm-requests/funding/${id}/proof`, { responseType: "blob" });
      return response.data as Blob;
    },
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    },
  });
}

export function useRmManualRequests(query: ListRmManualRequestsQuery) {
  return useQuery({
    queryKey: [...MANUAL_KEY, query],
    queryFn: () => unwrap<RmManualRequestSummary[]>(apiClient.get("/rm-requests/manual", { params: query })),
  });
}

export function useSetRmManualRequestStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string } & SetRmManualRequestStatusInput) =>
      unwrap(apiClient.post(`/rm-requests/manual/${id}/status`, { status })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MANUAL_KEY }),
  });
}

export function useRms() {
  return useQuery({
    queryKey: RMS_KEY,
    queryFn: () => unwrap<RmEntry[]>(apiClient.get("/rm-requests/rms")),
  });
}

export function useAssignUserToRm() {
  return useMutation({
    mutationFn: ({ userId, rmId }: { userId: string } & AssignRmUserInput) =>
      unwrap(apiClient.post(`/rm-requests/assign/${userId}`, { rmId })),
  });
}
