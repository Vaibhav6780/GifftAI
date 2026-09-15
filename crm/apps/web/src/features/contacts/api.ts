import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ContactDetail,
  ContactSummary,
  CreateContactInput,
  ListContactsQuery,
  PaginatedResult,
  UpdateContactInput,
} from "@gifftai/shared";
import { apiClient } from "../../lib/apiClient";
import { unwrap } from "../../lib/unwrap";

const LIST_KEY = ["contacts"] as const;
const detailKey = (id: string) => ["contacts", id] as const;

export function useContactsList(query: Partial<ListContactsQuery>) {
  return useQuery({
    queryKey: [...LIST_KEY, query],
    queryFn: () => unwrap<PaginatedResult<ContactSummary>>(apiClient.get("/contacts", { params: query })),
  });
}

export function useContact(id: string | undefined) {
  return useQuery({
    queryKey: detailKey(id ?? ""),
    queryFn: () => unwrap<ContactDetail>(apiClient.get(`/contacts/${id}`)),
    enabled: Boolean(id),
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateContactInput) => unwrap<ContactDetail>(apiClient.post("/contacts", input)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

export function useUpdateContact(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateContactInput) => unwrap<ContactDetail>(apiClient.patch(`/contacts/${id}`, input)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIST_KEY });
      queryClient.invalidateQueries({ queryKey: detailKey(id) });
    },
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unwrap<null>(apiClient.delete(`/contacts/${id}`)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LIST_KEY }),
  });
}
