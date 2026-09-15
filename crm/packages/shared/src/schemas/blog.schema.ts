import { z } from "zod";

/** Blog / CMS proxies gifftai_official_web's admin API. The `blog_posts` rows and their
 *  ids are that system's (Postgres UUIDs), not this repo's cuids. Field shape mirrors that
 *  repo's `BlogPostIn` (packages/common/src/admin_schemas.py), camel-cased at this boundary
 *  and mapped back to snake_case in modules/blog/blogAdminClient.ts. */

export const blogPostStatusSchema = z.enum(["draft", "published"]);
export type BlogPostStatusInput = z.infer<typeof blogPostStatusSchema>;

// Accepts string | null | undefined and normalises to a trimmed string or null —
// the edit form round-trips empty fields back as an explicit `null`, so `.nullish()`
// (not just `.optional()`) is required or every save of a post without a featured
// image / canonical URL / og image fails validation.
const optionalTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : null));

export const blogPostInputSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  // Server slugifies + dedupes; blank → derived from the title.
  slug: z
    .string()
    .trim()
    .max(200)
    .nullish()
    .transform((v) => (v ? v : undefined)),
  excerpt: optionalTrimmed(320),
  content: z.string().min(1, "Content is required"),
  featuredImage: optionalTrimmed(500),
  author: optionalTrimmed(120),
  category: optionalTrimmed(60),
  tags: z.array(z.string().trim().min(1)).max(30).default([]),
  status: blogPostStatusSchema.default("draft"),
  seoTitle: optionalTrimmed(200),
  metaDescription: optionalTrimmed(320),
  canonicalUrl: optionalTrimmed(500),
  ogImage: optionalTrimmed(500),
});
export type BlogPostInput = z.infer<typeof blogPostInputSchema>;

export const listBlogPostsQuerySchema = z.object({
  status: z.enum(["draft", "published", "all"]).optional(),
  q: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).optional(),
  perPage: z.coerce.number().int().min(1).max(100).optional(),
});
export type ListBlogPostsQuery = z.infer<typeof listBlogPostsQuerySchema>;

export const blogSlugCheckQuerySchema = z.object({
  slug: z.string().trim().min(1).max(200),
  id: z.string().uuid().optional(),
});
export type BlogSlugCheckQuery = z.infer<typeof blogSlugCheckQuerySchema>;
