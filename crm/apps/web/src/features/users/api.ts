import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateUserInput,
  ListUsersQuery,
  PaginatedResult,
  SetUserPasswordInput,
  SetUserRolesInput,
  UpdateUserInput,
  UpdateUserStatusInput,
  UserDetail,
  UserSummary,
} from "@gifftai/shared";
import { apiClient } from "../../lib/apiClient";
import { unwrap } from "../../lib/unwrap";

const LIST_KEY = ["users"] as const;
const detailKey = (id: string) => ["users", id] as const;

export function useUsersList(query: Partial<ListUsersQuery>) {
  return useQuery({
    queryKey: [...LIST_KEY, query],
    queryFn: () => unwrap<PaginatedResult<UserSummary>>(apiClient.get("/users", { params: query })),
  });
}

export function useUser(id: string | undefined) {
  return useQuery({
    queryKey: detailKey(id ?? ""),
    queryFn: () => unwrap<UserDetail>(apiClient.get(`/users/${id}`)),
    enabled: Boolean(id),
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateUserInput) => unwrap<UserDetail>(apiClient.post("/users", input)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

export function useUpdateUser(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateUserInput) => unwrap<UserDetail>(apiClient.patch(`/users/${id}`, input)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIST_KEY });
      queryClient.invalidateQueries({ queryKey: detailKey(id) });
    },
  });
}

export function useUpdateUserStatus(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateUserStatusInput) =>
      unwrap<UserDetail>(apiClient.patch(`/users/${id}/status`, input)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIST_KEY });
      queryClient.invalidateQueries({ queryKey: detailKey(id) });
    },
  });
}

export function useSetUserRoles(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SetUserRolesInput) => unwrap<UserDetail>(apiClient.put(`/users/${id}/roles`, input)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIST_KEY });
      queryClient.invalidateQueries({ queryKey: detailKey(id) });
    },
  });
}

export function useSetUserPassword(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SetUserPasswordInput) => unwrap<UserDetail>(apiClient.patch(`/users/${id}/password`, input)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: detailKey(id) }),
  });
}

export function useDeactivateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unwrap<UserDetail>(apiClient.delete(`/users/${id}`)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

/** Irreversibly removes the user row — distinct from useDeactivateUser, which just flips
 *  status and is fully reversible. Super Admin only (users:delete_permanent). */
export function useHardDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unwrap<null>(apiClient.delete(`/users/${id}/permanent`)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

export function useResendWelcome(id: string) {
  return useMutation({
    mutationFn: () => unwrap<null>(apiClient.post(`/users/${id}/resend-welcome`)),
  });
}
