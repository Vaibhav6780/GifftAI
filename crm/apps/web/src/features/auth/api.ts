import { useMutation, useQuery } from "@tanstack/react-query";
import type { AuthUser, ForgotPasswordInput, LoginInput, LoginResult, ResetPasswordInput } from "@gifftai/shared";
import { apiClient } from "../../lib/apiClient";
import { unwrap } from "../../lib/unwrap";
import { useAuthStore } from "./authStore";

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: (input: LoginInput) => unwrap<LoginResult>(apiClient.post("/auth/login", input)),
    onSuccess: ({ user, tokens }) => {
      setSession(user, tokens.accessToken);
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (input: ForgotPasswordInput) => unwrap<null>(apiClient.post("/auth/forgot-password", input)),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (input: ResetPasswordInput) => unwrap<null>(apiClient.post("/auth/reset-password", input)),
  });
}

export function useLogout() {
  const clearSession = useAuthStore((s) => s.clearSession);
  return useMutation({
    mutationFn: () => unwrap<null>(apiClient.post("/auth/logout")),
    onSettled: () => clearSession(),
  });
}

/**
 * Fetches the current session on app boot. With no access token yet in memory this
 * 401s once, which the apiClient response interceptor turns into a silent
 * /auth/refresh (via the httpOnly cookie) before retrying — so a page reload
 * transparently restores the session if the refresh token is still valid.
 */
export function useMe(enabled: boolean) {
  const setSession = useAuthStore((s) => s.setSession);
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const user = await unwrap<AuthUser>(apiClient.get("/auth/me"));
      const accessToken = useAuthStore.getState().accessToken;
      if (accessToken) setSession(user, accessToken);
      return user;
    },
    enabled,
    retry: false,
  });
}
