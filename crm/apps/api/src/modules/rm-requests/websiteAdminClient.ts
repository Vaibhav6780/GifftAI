import { env } from "../../config/env";
import { httpRequestJson, HttpClientError } from "../../lib/httpClient";
import { AppError } from "../../lib/apiError";

/**
 * Thin client for gifftai_official_web's admin API `/rm/*` routes — RM Funding Requests
 * (two-admin approve→credit flow) and RM Manual Requests. This repo never stores RM
 * request rows itself; the website's Postgres stays the single source of truth and every
 * call here is live. Auth is a shared X-Service-Key plus X-Actor-Email (the signed-in CRM
 * user's email), which the website resolves to a real admin/employee identity — see
 * get_current_admin in that repo's services/admin/dependencies.py. Preserves the
 * website's own RBAC, audit log, and "credit must be a different admin than approve" rule
 * unchanged, since every action carries a genuine website admin identity, not a generic
 * service actor.
 */

export interface RmFundingRequestDto {
  id: string;
  rm_id: string;
  rm_name: string;
  user_id: string;
  user_name: string;
  user_email: string | null;
  amount: number;
  currency: string;
  method: string | null;
  note: string | null;
  has_proof: boolean;
  status: string;
  approved_by: string | null;
  approved_at: string | null;
  credited_by: string | null;
  credited_at: string | null;
  rejection_reason: string | null;
  created_at: string | null;
}

export interface RmManualRequestDto {
  id: string;
  user_id: string | null;
  user_name: string | null;
  user_email: string | null;
  side: string;
  amount: number;
  method: string | null;
  phone: string | null;
  payout_details: string | null;
  note: string | null;
  status: string;
  created_at: string | null;
}

export interface RmEntryDto {
  id: string;
  name: string;
  email: string | null;
}

export interface ProofFile {
  buffer: Buffer;
  contentType: string;
  fileName: string;
}

export function isRmRequestsConfigured(): boolean {
  return Boolean(env.WEBSITE_ADMIN_API_URL && env.WEBSITE_ADMIN_SERVICE_KEY);
}

function assertConfigured(): { baseUrl: string; serviceKey: string } {
  if (!env.WEBSITE_ADMIN_API_URL || !env.WEBSITE_ADMIN_SERVICE_KEY) {
    throw AppError.badRequest(
      "RM Requests isn't connected to gifftai.com yet — set WEBSITE_ADMIN_API_URL and WEBSITE_ADMIN_SERVICE_KEY.",
    );
  }
  return { baseUrl: env.WEBSITE_ADMIN_API_URL.replace(/\/$/, ""), serviceKey: env.WEBSITE_ADMIN_SERVICE_KEY };
}

/** Maps a failed upstream (website admin API) call to a matching CRM AppError so the
 *  frontend gets the website's real message instead of a generic 500. */
function toAppError(error: unknown, label: string): AppError {
  if (error instanceof HttpClientError) {
    const detail =
      error.body && typeof error.body === "object" && "detail" in (error.body as Record<string, unknown>)
        ? (error.body as { detail?: unknown }).detail
        : undefined;
    const message = typeof detail === "string" ? detail : error.message;
    const status = error.status;
    if (status === 401) return AppError.unauthorized(message);
    if (status === 403) return AppError.forbidden(message);
    if (status === 404) return AppError.notFound(message);
    if (status === 409) return AppError.conflict(message);
    if (status !== undefined && status >= 400 && status < 500) return AppError.badRequest(message);
    return new AppError(502, "UPSTREAM_ERROR", `${label}: ${message}`);
  }
  return new AppError(502, "UPSTREAM_ERROR", `${label}: ${error instanceof Error ? error.message : String(error)}`);
}

async function callJson<T>(
  actorEmail: string,
  path: string,
  init: Omit<RequestInit, "signal"> = {},
  label = path,
): Promise<T> {
  const { baseUrl, serviceKey } = assertConfigured();
  try {
    return await httpRequestJson<T>(`${baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        "X-Service-Key": serviceKey,
        "X-Actor-Email": actorEmail,
        ...(init.headers as Record<string, string> | undefined),
      },
      label,
    });
  } catch (error) {
    throw toAppError(error, label);
  }
}

function statusQuery(status?: string): string {
  return status && status !== "all" ? `?status=${encodeURIComponent(status)}` : "";
}

export async function listFundingRequests(actorEmail: string, status?: string): Promise<RmFundingRequestDto[]> {
  const data = await callJson<{ requests: RmFundingRequestDto[] }>(
    actorEmail,
    `/rm/requests${statusQuery(status)}`,
    { method: "GET" },
    "rm.listFundingRequests",
  );
  return data.requests;
}

export async function approveFundingRequest(actorEmail: string, id: string): Promise<{ message: string; status: string }> {
  return callJson(actorEmail, `/rm/requests/${id}/approve`, { method: "POST" }, "rm.approveFundingRequest");
}

export async function creditFundingRequest(
  actorEmail: string,
  id: string,
): Promise<{ message: string; status: string; new_main_wallet_balance: number }> {
  return callJson(actorEmail, `/rm/requests/${id}/credit`, { method: "POST" }, "rm.creditFundingRequest");
}

export async function rejectFundingRequest(
  actorEmail: string,
  id: string,
  reason: string,
): Promise<{ message: string; status: string }> {
  return callJson(
    actorEmail,
    `/rm/requests/${id}/reject`,
    { method: "POST", body: JSON.stringify({ reason }) },
    "rm.rejectFundingRequest",
  );
}

export async function getFundingProof(actorEmail: string, id: string): Promise<ProofFile> {
  const { baseUrl, serviceKey } = assertConfigured();
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/rm/requests/${id}/proof`, {
      headers: { "X-Service-Key": serviceKey, "X-Actor-Email": actorEmail },
    });
  } catch (error) {
    throw new AppError(
      502,
      "UPSTREAM_ERROR",
      `rm.getFundingProof: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (!response.ok) {
    const body = await response.json().catch(() => undefined);
    throw toAppError(
      new HttpClientError(`rm.getFundingProof failed with status ${response.status}`, response.status, body),
      "rm.getFundingProof",
    );
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get("content-type") ?? "application/octet-stream";
  const disposition = response.headers.get("content-disposition") ?? "";
  const fileName = /filename="?([^"]+)"?/.exec(disposition)?.[1] ?? `proof-${id}`;
  return { buffer, contentType, fileName };
}

export async function listManualRequests(actorEmail: string, status?: string): Promise<RmManualRequestDto[]> {
  const data = await callJson<{ items: RmManualRequestDto[] }>(
    actorEmail,
    `/rm/manual-requests${statusQuery(status)}`,
    { method: "GET" },
    "rm.listManualRequests",
  );
  return data.items;
}

export async function setManualRequestStatus(
  actorEmail: string,
  id: string,
  status: string,
): Promise<{ id: string; status: string }> {
  return callJson(
    actorEmail,
    `/rm/manual-requests/${id}/status`,
    { method: "POST", body: JSON.stringify({ status }) },
    "rm.setManualRequestStatus",
  );
}

export async function listRms(actorEmail: string): Promise<RmEntryDto[]> {
  const data = await callJson<{ rms: RmEntryDto[] }>(actorEmail, `/rm/list`, { method: "GET" }, "rm.listRms");
  return data.rms;
}

export async function assignUserToRm(
  actorEmail: string,
  userId: string,
  rmId: string | null,
): Promise<{ message: string; assigned_rm_id: string | null }> {
  return callJson(
    actorEmail,
    `/rm/assign/${userId}`,
    { method: "POST", body: JSON.stringify({ rm_id: rmId }) },
    "rm.assignUserToRm",
  );
}
