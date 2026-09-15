import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateDepartmentInput, DepartmentDetail, DepartmentNode, UpdateDepartmentInput } from "@gifftai/shared";
import { apiClient } from "../../lib/apiClient";
import { unwrap } from "../../lib/unwrap";

const LIST_KEY = ["departments"] as const;
const detailKey = (id: string) => ["departments", id] as const;

export function useDepartmentsList() {
  return useQuery({
    queryKey: LIST_KEY,
    queryFn: () => unwrap<DepartmentNode[]>(apiClient.get("/departments")),
  });
}

export function useDepartment(id: string | undefined) {
  return useQuery({
    queryKey: detailKey(id ?? ""),
    queryFn: () => unwrap<DepartmentDetail>(apiClient.get(`/departments/${id}`)),
    enabled: Boolean(id),
  });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDepartmentInput) =>
      unwrap<DepartmentDetail>(apiClient.post("/departments", input)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

export function useUpdateDepartment(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateDepartmentInput) =>
      unwrap<DepartmentDetail>(apiClient.patch(`/departments/${id}`, input)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIST_KEY });
      queryClient.invalidateQueries({ queryKey: detailKey(id) });
    },
  });
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unwrap<null>(apiClient.delete(`/departments/${id}`)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LIST_KEY }),
  });
}
