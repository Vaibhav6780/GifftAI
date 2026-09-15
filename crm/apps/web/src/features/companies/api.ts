import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CompanyDetail,
  CompanySummary,
  CreateCompanyInput,
  ListCompaniesQuery,
  PaginatedResult,
  UpdateCompanyInput,
} from "@gifftai/shared";
import { apiClient } from "../../lib/apiClient";
import { unwrap } from "../../lib/unwrap";

const LIST_KEY = ["companies"] as const;
const detailKey = (id: string) => ["companies", id] as const;

export function useCompaniesList(query: Partial<ListCompaniesQuery>) {
  return useQuery({
    queryKey: [...LIST_KEY, query],
    queryFn: () => unwrap<PaginatedResult<CompanySummary>>(apiClient.get("/companies", { params: query })),
  });
}

export function useCompany(id: string | undefined) {
  return useQuery({
    queryKey: detailKey(id ?? ""),
    queryFn: () => unwrap<CompanyDetail>(apiClient.get(`/companies/${id}`)),
    enabled: Boolean(id),
  });
}

export function useCreateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCompanyInput) => unwrap<CompanyDetail>(apiClient.post("/companies", input)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

export function useUpdateCompany(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateCompanyInput) => unwrap<CompanyDetail>(apiClient.patch(`/companies/${id}`, input)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIST_KEY });
      queryClient.invalidateQueries({ queryKey: detailKey(id) });
    },
  });
}

export function useDeleteCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unwrap<null>(apiClient.delete(`/companies/${id}`)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LIST_KEY }),
  });
}
