import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AssignTicketInput,
  CreateTicketInput,
  ListTicketsQuery,
  PaginatedResult,
  TicketAttachment,
  TicketDetail,
  TicketSummary,
  UpdateTicketInput,
} from "@gifftai/shared";
import { apiClient } from "../../lib/apiClient";
import { unwrap } from "../../lib/unwrap";

const LIST_KEY = ["tickets"] as const;
const detailKey = (id: string) => ["tickets", id] as const;

export function useTicketsList(query: Partial<ListTicketsQuery>) {
  return useQuery({
    queryKey: [...LIST_KEY, query],
    queryFn: () => unwrap<PaginatedResult<TicketSummary>>(apiClient.get("/tickets", { params: query })),
  });
}

export function useTicket(id: string | undefined) {
  return useQuery({
    queryKey: detailKey(id ?? ""),
    queryFn: () => unwrap<TicketDetail>(apiClient.get(`/tickets/${id}`)),
    enabled: Boolean(id),
  });
}

export function useCreateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTicketInput) => unwrap<TicketDetail>(apiClient.post("/tickets", input)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

export function useUpdateTicket(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateTicketInput) => unwrap<TicketDetail>(apiClient.patch(`/tickets/${id}`, input)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIST_KEY });
      queryClient.invalidateQueries({ queryKey: detailKey(id) });
    },
  });
}

export function useAssignTicket(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AssignTicketInput) => unwrap<TicketDetail>(apiClient.patch(`/tickets/${id}/assign`, input)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIST_KEY });
      queryClient.invalidateQueries({ queryKey: detailKey(id) });
    },
  });
}

export function useDeleteTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unwrap<null>(apiClient.delete(`/tickets/${id}`)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

export function useTicketAttachments(ticketId: string | undefined) {
  return useQuery({
    queryKey: [...detailKey(ticketId ?? ""), "attachments"],
    queryFn: () => unwrap<TicketAttachment[]>(apiClient.get(`/tickets/${ticketId}/attachments`)),
    enabled: Boolean(ticketId),
  });
}

export function useUploadTicketAttachments(ticketId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (files: File[]) => {
      const formData = new FormData();
      for (const file of files) formData.append("attachments", file);
      return unwrap<TicketAttachment[]>(
        apiClient.post(`/tickets/${ticketId}/attachments`, formData, {
          headers: { "content-type": "multipart/form-data" },
        }),
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [...detailKey(ticketId), "attachments"] }),
  });
}

export function useDeleteTicketAttachment(ticketId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: string) =>
      unwrap<null>(apiClient.delete(`/tickets/${ticketId}/attachments/${attachmentId}`)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [...detailKey(ticketId), "attachments"] }),
  });
}
