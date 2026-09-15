/** Camel-cased views of gifftai_official_web's `/blog/*` admin API responses — that
 *  system's Postgres (`blog_posts`, migration 0107) is the source of truth; this repo
 *  never persists these rows. Published posts render at gifftai.com/blog automatically. */

export type BlogPostStatus = "draft" | "published";

export interface BlogPostListItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  featuredImage: string | null;
  /** Absolute URL for the featured image, resolved against the public site. */
  featuredImageUrl: string | null;
  author: string | null;
  category: string | null;
  tags: string[];
  status: BlogPostStatus;
  publishedAt: string | null;
  updatedAt: string | null;
}

export interface BlogPostDetail extends BlogPostListItem {
  content: string;
  authorId: string | null;
  seoTitle: string | null;
  metaDescription: string | null;
  canonicalUrl: string | null;
  ogImage: string | null;
  ogImageUrl: string | null;
  createdAt: string | null;
}

export interface BlogPostListResult {
  items: BlogPostListItem[];
  total: number;
  page: number;
  perPage: number;
}

export interface BlogSlugCheck {
  slug: string;
  available: boolean;
  suggestion: string;
}

export interface BlogImageUploadResult {
  /** Stored value, e.g. "/api/v1/blog/media/<hash>.webp". */
  url: string;
  /** Absolute URL for previewing the just-uploaded image. */
  previewUrl: string;
  filename: string;
}

export interface BlogConnectionStatus {
  connected: boolean;
}
