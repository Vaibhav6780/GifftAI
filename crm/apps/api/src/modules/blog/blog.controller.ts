import type { Request, Response } from "express";
import type {
  ApiResponse,
  BlogConnectionStatus,
  BlogPostInput,
  BlogSlugCheckQuery,
  ListBlogPostsQuery,
} from "@gifftai/shared";
import { blogService } from "./blog.service";
import type { BlogActor } from "./blogAdminClient";
import { asyncHandler } from "../../lib/asyncHandler";
import { AppError } from "../../lib/apiError";

function ok<T>(res: Response, data: T, status = 200): void {
  const body: ApiResponse<T> = { success: true, data };
  res.status(status).json(body);
}

/** The blog scopes gifftai understands, in the order we assert them. */
const BLOG_SCOPES = ["blog:read", "blog:manage"] as const;

/**
 * The acting user, resolved from the authenticated CRM session only. `requireAuth` +
 * `requirePermission` have already run, so `req.user` is trusted; the scope list is the
 * intersection of that user's real permissions with the blog scopes — it is never taken
 * from a request header or body. gifftai treats it as the authorization assertion.
 */
function blogActor(req: Request): BlogActor {
  const held = new Set(req.user!.permissions);
  return {
    email: req.user!.email,
    scopes: BLOG_SCOPES.filter((s) => held.has(s)),
  };
}

export const blogController = {
  status: asyncHandler(async (_req: Request, res: Response) => {
    const data: BlogConnectionStatus = { connected: blogService.isConfigured() };
    ok(res, data);
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as ListBlogPostsQuery;
    const data = await blogService.listPosts(blogActor(req), {
      status: query.status,
      q: query.q,
      page: query.page,
      perPage: query.perPage,
    });
    ok(res, data);
  }),

  slugCheck: asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as BlogSlugCheckQuery;
    const data = await blogService.checkSlug(blogActor(req), query.slug, query.id);
    ok(res, data);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const data = await blogService.getPost(blogActor(req), req.params.id!);
    ok(res, data);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const data = await blogService.createPost(blogActor(req), req.body as BlogPostInput);
    ok(res, data, 201);
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const data = await blogService.updatePost(
      blogActor(req),
      req.params.id!,
      req.body as BlogPostInput,
    );
    ok(res, data);
  }),

  publish: asyncHandler(async (req: Request, res: Response) => {
    const data = await blogService.setPostStatus(blogActor(req), req.params.id!, true);
    ok(res, data);
  }),

  unpublish: asyncHandler(async (req: Request, res: Response) => {
    const data = await blogService.setPostStatus(blogActor(req), req.params.id!, false);
    ok(res, data);
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    const data = await blogService.deletePost(blogActor(req), req.params.id!);
    ok(res, data);
  }),

  uploadImage: asyncHandler(async (req: Request, res: Response) => {
    const file = req.file;
    if (!file) throw AppError.badRequest("No image file was provided (field name: file).");
    const data = await blogService.uploadImage(blogActor(req), {
      buffer: file.buffer,
      contentType: file.mimetype,
      fileName: file.originalname || "upload",
    });
    ok(res, data, 201);
  }),
};
