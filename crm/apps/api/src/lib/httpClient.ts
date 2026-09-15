import { logger } from "../config/logger";

export class HttpClientError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "HttpClientError";
  }
}

export interface HttpRequestOptions extends Omit<RequestInit, "signal"> {
  /** Per-attempt timeout. Default 10s. */
  timeoutMs?: number;
  /** Total attempts including the first. Default 3. */
  retries?: number;
  /** Base delay for exponential backoff (doubles each retry). Default 500ms. */
  retryDelayMs?: number;
  /** Human-readable label used in retry/error logs (e.g. "telegram.sendMessage"). */
  label?: string;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Retries on network failure and 429/5xx — never on other 4xx (those won't succeed on retry). */
function isRetryable(status?: number): boolean {
  if (status === undefined) return true;
  return status === 429 || status >= 500;
}

/**
 * fetch() wrapper for outbound calls to third-party platform APIs (Telegram/Meta/LinkedIn),
 * with a request timeout and exponential-backoff retries. Kept on global fetch rather than
 * axios — the API has no existing HTTP client dependency and doesn't need interceptors.
 */
export async function httpRequestJson<T>(url: string, options: HttpRequestOptions = {}): Promise<T> {
  const { timeoutMs = 10_000, retries = 3, retryDelayMs = 500, label = url, ...init } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timeout);

      const contentType = response.headers.get("content-type") ?? "";
      const body = contentType.includes("application/json")
        ? await response.json().catch(() => undefined)
        : await response.text().catch(() => undefined);

      if (!response.ok) {
        if (isRetryable(response.status) && attempt < retries) {
          logger.warn({ label, attempt, status: response.status }, "Outbound API call failed, retrying");
          await sleep(retryDelayMs * 2 ** (attempt - 1));
          continue;
        }
        throw new HttpClientError(`${label} failed with status ${response.status}`, response.status, body);
      }

      return body as T;
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;
      if (error instanceof HttpClientError) throw error;

      if (attempt < retries) {
        logger.warn({ label, attempt, err: error }, "Outbound API call errored, retrying");
        await sleep(retryDelayMs * 2 ** (attempt - 1));
        continue;
      }
    }
  }

  throw new HttpClientError(
    `${label} failed after ${retries} attempts: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
  );
}
