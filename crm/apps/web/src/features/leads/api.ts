import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AssignLeadInput,
  BulkAssignLeadsInput,
  ContactedLeadsQuery,
  CreateLeadInput,
  CreateLeadNoteInput,
  ExportLeadsQuery,
  LeadActivityEntry,
  LeadContactedSummary,
  LeadDetail,
  LeadFollowupSummary,
  LeadNote,
  LeadStatusCounts,
  LeadSummary,
  LeadsStatsQuery,
  LeadTimelineEntry,
  ListLeadFollowupsQuery,
  ListLeadsQuery,
  MarkLeadContactedInput,
  PaginatedResult,
  UpdateLeadInput,
} from "@gifftai/shared";
import { apiClient } from "../../lib/apiClient";
import { unwrap } from "../../lib/unwrap";

const LIST_KEY = ["leads"] as const;
const detailKey = (id: string) => ["leads", id] as const;

export function useLeadsList(query: Partial<ListLeadsQuery>) {
  return useQuery({
    queryKey: [...LIST_KEY, query],
    queryFn: () => unwrap<PaginatedResult<LeadSummary>>(apiClient.get("/leads", { params: query })),
  });
}

export function useContactedLeadsList(query: Partial<ContactedLeadsQuery> & { date: string }) {
  return useQuery({
    queryKey: [...LIST_KEY, "contacted", query],
    queryFn: () => unwrap<PaginatedResult<LeadContactedSummary>>(apiClient.get("/leads/contacted", { params: query })),
  });
}

export function useLeadFollowups(query: Partial<ListLeadFollowupsQuery>) {
  return useQuery({
    queryKey: [...LIST_KEY, "followups", query],
    queryFn: () => unwrap<PaginatedResult<LeadFollowupSummary>>(apiClient.get("/leads/followups", { params: query })),
  });
}

export function useLeadStats(query: Partial<LeadsStatsQuery>) {
  return useQuery({
    queryKey: [...LIST_KEY, "stats", query],
    queryFn: () => unwrap<LeadStatusCounts>(apiClient.get("/leads/stats", { params: query })),
  });
}

export function useExportLeads() {
  return useMutation({
    mutationFn: async (query: Partial<ExportLeadsQuery>) => {
      const response = await apiClient.get("/leads/export", { params: query, responseType: "blob" });
      return response.data as Blob;
    },
  });
}

export function useLead(id: string | undefined) {
  return useQuery({
    queryKey: detailKey(id ?? ""),
    queryFn: () => unwrap<LeadDetail>(apiClient.get(`/leads/${id}`)),
    enabled: Boolean(id),
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateLeadInput) => unwrap<LeadDetail>(apiClient.post("/leads", input)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

export function useUpdateLead(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateLeadInput) => unwrap<LeadDetail>(apiClient.patch(`/leads/${id}`, input)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIST_KEY });
      queryClient.invalidateQueries({ queryKey: detailKey(id) });
    },
  });
}

export function useAssignLead(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AssignLeadInput) => unwrap<LeadDetail>(apiClient.patch(`/leads/${id}/assign`, input)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIST_KEY });
      queryClient.invalidateQueries({ queryKey: detailKey(id) });
    },
  });
}

export function useMarkLeadContacted() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: MarkLeadContactedInput }) =>
      unwrap<LeadDetail>(apiClient.patch(`/leads/${id}/contacted`, input)),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: LIST_KEY });
      queryClient.invalidateQueries({ queryKey: detailKey(id) });
    },
  });
}

export function useBulkAssignLeads() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BulkAssignLeadsInput) =>
      unwrap<{ count: number }>(apiClient.patch("/leads/bulk-assign", input)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

export function useLeadTimeline(id: string | undefined) {
  return useQuery({
    queryKey: [...detailKey(id ?? ""), "timeline"],
    queryFn: () => unwrap<LeadTimelineEntry[]>(apiClient.get(`/leads/${id}/timeline`)),
    enabled: Boolean(id),
  });
}

export function useLeadNotes(id: string | undefined) {
  return useQuery({
    queryKey: [...detailKey(id ?? ""), "notes"],
    queryFn: () => unwrap<LeadNote[]>(apiClient.get(`/leads/${id}/notes`)),
    enabled: Boolean(id),
  });
}

export function useLeadActivity(id: string | undefined) {
  return useQuery({
    queryKey: [...detailKey(id ?? ""), "activity"],
    queryFn: () => unwrap<LeadActivityEntry[]>(apiClient.get(`/leads/${id}/activity`)),
    enabled: Boolean(id),
  });
}

export function useAddLeadNote(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateLeadNoteInput) => unwrap<LeadNote>(apiClient.post(`/leads/${id}/notes`, input)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...detailKey(id), "notes"] });
      queryClient.invalidateQueries({ queryKey: [...detailKey(id), "activity"] });
    },
  });
}

export function useUpdateLeadNote(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ noteId, input }: { noteId: string; input: CreateLeadNoteInput }) =>
      unwrap<LeadNote>(apiClient.patch(`/leads/${id}/notes/${noteId}`, input)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...detailKey(id), "notes"] });
      queryClient.invalidateQueries({ queryKey: [...detailKey(id), "activity"] });
    },
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unwrap<null>(apiClient.delete(`/leads/${id}`)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

export function useConvertLead(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => unwrap<LeadDetail>(apiClient.post(`/leads/${id}/convert`)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIST_KEY });
      queryClient.invalidateQueries({ queryKey: detailKey(id) });
    },
  });
}
