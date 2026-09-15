import axios, { AxiosError, isAxiosError, type InternalAxiosRequestConfig } from "axios";
import type { ApiErrorResponse, ApiResponse, LoginResult } from "@gifftai/shared";
import { useAuthStore } from "../features/auth/authStore";

export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

export const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const accessToken = useAuthStore.getState().accessToken;
  if (accessToken) {
    config.headers.set("Authorization", `Bearer ${accessToken}`);
  }
  return config;
});

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

let refreshPromise: Promise<LoginResult> | null = null;

async function refreshSession(): Promise<LoginResult> {
  try {
    const response = await axios.post<ApiResponse<LoginResult>>(
      `${API_URL}/auth/refresh`,
      {},
      { withCredentials: true, headers: { "X-Requested-With": "XMLHttpRequest" } },
    );
    if (!response.data.success) throw new Error(response.data.error.message);
    return response.data.data;
  } catch (error) {
    if (isAxiosError<ApiResponse<LoginResult>>(error)) {
      const data = error.response?.data;
      if (data && !data.success) throw new Error(data.error.message);
      throw new Error("Your session has expired. Please sign in again.");
    }
    throw error;
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorResponse>) => {
    const config = error.config as RetryableConfig | undefined;
    const isAuthEndpoint = config?.url?.includes("/auth/login") || config?.url?.includes("/auth/refresh");

    if (error.response?.status === 401 && config && !config._retried && !isAuthEndpoint) {
      config._retried = true;
      try {
        refreshPromise ??= refreshSession();
        const { user, tokens } = await refreshPromise;
        useAuthStore.getState().setSession(user, tokens.accessToken);
        config.headers.set("Authorization", `Bearer ${tokens.accessToken}`);
        return apiClient(config);
      } catch (refreshError) {
        useAuthStore.getState().clearSession();
        return Promise.reject(refreshError);
      } finally {
        refreshPromise = null;
      }
    }

    return Promise.reject(error);
  },
);
