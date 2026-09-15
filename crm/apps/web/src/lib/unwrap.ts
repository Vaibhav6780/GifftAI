import { isAxiosError } from "axios";
import type { ApiResponse } from "@gifftai/shared";

/**
 * Axios rejects the promise for any non-2xx response, so that case never
 * reaches the `data.success` check below — without this, callers only ever
 * saw AxiosError's generic "Request failed with status code 4xx/5xx"
 * instead of the real backend reason (wrong password, not found, etc).
 */
export async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  try {
    const { data } = await promise;
    if (!data.success) throw new Error(data.error.message);
    return data.data;
  } catch (error) {
    if (isAxiosError<ApiResponse<T>>(error)) {
      const data = error.response?.data;
      if (data && !data.success) throw new Error(data.error.message);
      if (!error.response) throw new Error("Could not reach the server — check your connection and try again.");
      throw new Error(`Server error (${error.response.status}). Please try again.`);
    }
    throw error;
  }
}
