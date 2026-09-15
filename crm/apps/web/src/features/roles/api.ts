import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateRoleInput,
  RoleDetail,
  RoleSummary,
  SetRolePermissionsInput,
  UpdateRoleInput,
} from "@gifftai/shared";
import { apiClient } from "../../lib/apiClient";
import { unwrap } from "../../lib/unwrap";

const LIST_KEY = ["roles"] as const;
const detailKey = (id: string) => ["roles", id] as const;

export function useRolesList() {
  return useQuery({
    queryKey: LIST_KEY,
    queryFn: () => unwrap<RoleSummary[]>(apiClient.get("/roles")),
  });
}

export function useRole(id: string | undefined) {
  return useQuery({
    queryKey: detailKey(id ?? ""),
    queryFn: () => unwrap<RoleDetail>(apiClient.get(`/roles/${id}`)),
    enabled: Boolean(id),
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRoleInput) => unwrap<RoleDetail>(apiClient.post("/roles", input)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

export function useUpdateRole(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateRoleInput) => unwrap<RoleDetail>(apiClient.patch(`/roles/${id}`, input)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIST_KEY });
      queryClient.invalidateQueries({ queryKey: detailKey(id) });
    },
  });
}

export function useSetRolePermissions(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SetRolePermissionsInput) =>
      unwrap<RoleDetail>(apiClient.put(`/roles/${id}/permissions`, input)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIST_KEY });
      queryClient.invalidateQueries({ queryKey: detailKey(id) });
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unwrap<null>(apiClient.delete(`/roles/${id}`)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LIST_KEY }),
  });
}
