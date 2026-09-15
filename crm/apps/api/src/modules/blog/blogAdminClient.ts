import { env } from "../../config/env";
import { httpRequestJson, HttpClientError } from "../../lib/httpClient";
import { AppError } from "../../lib/apiError";

/**
 * Thin client for gifftai_official_web's admin API `/blog/*` routes — the Blog / CMS
 * management surface. This repo never stores blog rows itself; that repo's Postgres
 * (`blog_posts`, migration 0107) stays the single source of truth and every call here is
 * live.
 *
 * Auth: the shared X-Service-Key authenticates this CRM *service* to gifftai (same secret
 * RM Requests uses). Unlike RM Requests, blog calls do NOT require the acting user to also
 * be a gifftai admin/employee — CRM permissions are the source of truth. We send:
 *   • X-CRM-Blog-Scope — the acting user's blog scope ("blog:read" / "blog:manage"),
 *     derived server-side from req.user.permissions (see blog.controller.ts), never from
 *     anything the browser sends. gifftai's require_blog_permission maps this to the
 *     concrete blog.* permission and enforces it, so read-only users can't reach writes.
 *   • X-Actor-Email — the acting CRM user's email, recorded in gifftai's audit trail as
 *     "crm:<email>". Audit-only; it grants nothing.
 *
 * DTOs below are snake_case — the exact shapes that repo's blog_service.py returns.
 */

/** Who is acting, resolved server-side from the CRM session — never client input. */
export interface BlogActor {
  /** The acting CRM user's email (audit label on the gifftai side). */
  email: string;
  /** Their granted blog scope(s): a subset of "blog:read" / "blog:manage". */
  scopes: string[];
}

export interface BlogPostListItemDto {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  featured_image: string | null;
  author: string | null;
  category: string | null;
  tags: string[];
  status: string;
  published_at: string | null;
  updated_at: string | null;
}

export interface BlogPostDto extends BlogPostListItemDto {
  content: string;
  author_id: string | null;
  seo_title: string | null;
  meta_description: string | null;
  canonical_url: string | null;
  og_image: string | null;
  created_at: string | null;
}

export interface BlogPostListDto {
  items: BlogPostListItemDto[];
  total: number;
  page: number;
  per_page: number;
}

export interface BlogSlugCheckDto {
  slug: string;
  available: boolean;
  suggestion: string;
}

export interface BlogImageUploadDto {
  url: string;
  filename: string;
}

/** Fields accepted by that repo's `BlogPostIn` (packages/common/src/admin_schemas.py). */
export interface BlogPostInDto {
  title: string;
  slug?: string;
  excerpt: string | null;
  content: string;
  featured_image: string | null;
  author: string | null;
  category: string | null;
  tags: string[];
  status: string;
  seo_title: string | null;
  meta_description: string | null;
  canonical_url: string | null;
  og_image: string | null;
}

export function isBlogConfigured(): boolean {
  return Boolean(env.WEBSITE_ADMIN_API_URL && env.WEBSITE_ADMIN_SERVICE_KEY);
}

function assertConfigured(): { baseUrl: string; serviceKey: string } {
  if (!env.WEBSITE_ADMIN_API_URL || !env.WEBSITE_ADMIN_SERVICE_KEY) {
    throw AppError.badRequest(
      "Blog isn't connected to gifftai.com yet — set WEBSITE_ADMIN_API_URL and WEBSITE_ADMIN_SERVICE_KEY.",
    );
  }
  return {
    baseUrl: env.WEBSITE_ADMIN_API_URL.replace(/\/$/, ""),
    serviceKey: env.WEBSITE_ADMIN_SERVICE_KEY,
  };
}

/** Maps a failed upstream (website admin API) call to a matching CRM AppError so the
 *  frontend gets the website's real message (FastAPI `detail`) instead of a generic 500. */
function toAppError(error: unknown, label: string): AppError {
  if (error instanceof HttpClientError) {
    const detail =
      error.body &&
      typeof error.body === "object" &&
      "detail" in (error.body as Record<string, unknown>)
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
  return new AppError(
    502,
    "UPSTREAM_ERROR",
    `${label}: ${error instanceof Error ? error.message : String(error)}`,
  );
}

/** The auth headers every blog call carries. `serviceKey` authenticates the CRM service;
 *  `X-CRM-Blog-Scope` is the per-user authorization assertion gifftai enforces. */
function authHeaders(actor: BlogActor, serviceKey: string): Record<string, string> {
  return {
    "X-Service-Key": serviceKey,
    "X-Actor-Email": actor.email,
    "X-CRM-Blog-Scope": actor.scopes.join(","),
  };
}

async function callJson<T>(
  actor: BlogActor,
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
        ...authHeaders(actor, serviceKey),
        ...(init.headers as Record<string, string> | undefined),
      },
      label,
    });
  } catch (error) {
    throw toAppError(error, label);
  }
}

function qs(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== "");
  if (entries.length === 0) return "";
  return `?${entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join("&")}`;
}

export interface ListPostsParams {
  status?: string;
  q?: string;
  page?: number;
  perPage?: number;
}

export async function listPosts(
  actor: BlogActor,
  params: ListPostsParams,
): Promise<BlogPostListDto> {
  return callJson<BlogPostListDto>(
    actor,
    `/blog${qs({
      status: params.status && params.status !== "all" ? params.status : undefined,
      q: params.q,
      page: params.page,
      per_page: params.perPage,
    })}`,
    { method: "GET" },
    "blog.listPosts",
  );
}

export async function getPost(actor: BlogActor, id: string): Promise<BlogPostDto> {
  return callJson<BlogPostDto>(actor, `/blog/${id}`, { method: "GET" }, "blog.getPost");
}

export async function createPost(
  actor: BlogActor,
  body: BlogPostInDto,
): Promise<{ message: string; id: string; slug: string }> {
  return callJson(
    actor,
    `/blog`,
    { method: "POST", body: JSON.stringify(body) },
    "blog.createPost",
  );
}

export async function updatePost(
  actor: BlogActor,
  id: string,
  body: BlogPostInDto,
): Promise<{ message: string; slug: string }> {
  return callJson(
    actor,
    `/blog/${id}`,
    { method: "PUT", body: JSON.stringify(body) },
    "blog.updatePost",
  );
}

export async function setPostStatus(
  actor: BlogActor,
  id: string,
  publish: boolean,
): Promise<{ message: string; status: string }> {
  return callJson(
    actor,
    `/blog/${id}/${publish ? "publish" : "unpublish"}`,
    { method: "POST" },
    "blog.setPostStatus",
  );
}

export async function deletePost(actor: BlogActor, id: string): Promise<{ message: string }> {
  return callJson(actor, `/blog/${id}`, { method: "DELETE" }, "blog.deletePost");
}

export async function checkSlug(
  actor: BlogActor,
  slug: string,
  excludeId?: string,
): Promise<BlogSlugCheckDto> {
  return callJson<BlogSlugCheckDto>(
    actor,
    `/blog/slug-check${qs({ slug, id: excludeId })}`,
    { method: "GET" },
    "blog.checkSlug",
  );
}

export interface UploadImageFile {
  buffer: Buffer;
  contentType: string;
  fileName: string;
}

export async function uploadImage(
  actor: BlogActor,
  file: UploadImageFile,
): Promise<BlogImageUploadDto> {
  const { baseUrl, serviceKey } = assertConfigured();
  const form = new FormData();
  form.append("file", new Blob([file.buffer], { type: file.contentType }), file.fileName);

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/blog/upload`, {
      method: "POST",
      // No Content-Type header — fetch sets the multipart boundary itself.
      headers: authHeaders(actor, serviceKey),
      body: form,
    });
  } catch (error) {
    throw new AppError(
      502,
      "UPSTREAM_ERROR",
      `blog.uploadImage: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  const body = await response.json().catch(() => undefined);
  if (!response.ok) {
    throw toAppError(
      new HttpClientError(
        `blog.uploadImage failed with status ${response.status}`,
        response.status,
        body,
      ),
      "blog.uploadImage",
    );
  }
  return body as BlogImageUploadDto;
}
