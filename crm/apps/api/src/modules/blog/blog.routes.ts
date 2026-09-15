import { Router } from "express";
import {
  blogPostInputSchema,
  blogSlugCheckQuerySchema,
  listBlogPostsQuerySchema,
} from "@gifftai/shared";
import { blogController } from "./blog.controller";
import { validate } from "../../middleware/validate.middleware";
import { requireAuth } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/rbac.middleware";
import { blogImageUploadSingle } from "../../lib/blogImageUpload";

export const blogRouter = Router();

blogRouter.use(requireAuth);

blogRouter.get("/status", requirePermission("blog:read"), blogController.status);

blogRouter.get(
  "/",
  requirePermission("blog:read"),
  validate(listBlogPostsQuerySchema, "query"),
  blogController.list,
);
blogRouter.get(
  "/slug-check",
  requirePermission("blog:read"),
  validate(blogSlugCheckQuerySchema, "query"),
  blogController.slugCheck,
);
blogRouter.get("/:id", requirePermission("blog:read"), blogController.getById);

blogRouter.post(
  "/",
  requirePermission("blog:manage"),
  validate(blogPostInputSchema),
  blogController.create,
);
blogRouter.put(
  "/:id",
  requirePermission("blog:manage"),
  validate(blogPostInputSchema),
  blogController.update,
);
blogRouter.post("/:id/publish", requirePermission("blog:manage"), blogController.publish);
blogRouter.post("/:id/unpublish", requirePermission("blog:manage"), blogController.unpublish);
blogRouter.delete("/:id", requirePermission("blog:manage"), blogController.remove);

blogRouter.post(
  "/upload",
  requirePermission("blog:manage"),
  blogImageUploadSingle("file"),
  blogController.uploadImage,
);
