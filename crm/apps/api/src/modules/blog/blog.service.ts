import type {
  BlogPostDetail,
  BlogPostListItem,
  BlogPostListResult,
  BlogPostStatus,
  BlogSlugCheck,
  BlogImageUploadResult,
  BlogPostInput,
} from "@gifftai/shared";
import { env } from "../../config/env";
import * as websiteAdmin from "./blogAdminClient";
import type {
  BlogActor,
  BlogPostDto,
  BlogPostInDto,
  BlogPostListItemDto,
  ListPostsParams,
  UploadImageFile,
} from "./blogAdminClient";

/** Turn a stored image reference ("/api/v1/blog/media/<hash>.webp" or an absolute URL)
 *  into an absolute URL the CRM UI can render. The bytes are served publicly by the
 *  gifftai gateway — same URL the marketing site itself uses. */
function toAbsoluteImageUrl(stored: string | null): string | null {
  if (!stored) return null;
  if (/^https?:\/\//i.test(stored)) return stored;
  const base = env.WEBSITE_PUBLIC_URL.replace(/\/$/, "");
  return `${base}${stored.startsWith("/") ? "" : "/"}${stored}`;
}

function normaliseStatus(status: string): BlogPostStatus {
  return status === "published" ? "published" : "draft";
}

function toListItem(dto: BlogPostListItemDto): BlogPostListItem {
  return {
    id: dto.id,
    title: dto.title,
    slug: dto.slug,
    excerpt: dto.excerpt,
    featuredImage: dto.featured_image,
    featuredImageUrl: toAbsoluteImageUrl(dto.featured_image),
    author: dto.author,
    category: dto.category,
    tags: dto.tags ?? [],
    status: normaliseStatus(dto.status),
    publishedAt: dto.published_at,
    updatedAt: dto.updated_at,
  };
}

function toDetail(dto: BlogPostDto): BlogPostDetail {
  return {
    ...toListItem(dto),
    content: dto.content,
    authorId: dto.author_id,
    seoTitle: dto.seo_title,
    metaDescription: dto.meta_description,
    canonicalUrl: dto.canonical_url,
    ogImage: dto.og_image,
    ogImageUrl: toAbsoluteImageUrl(dto.og_image),
    createdAt: dto.created_at,
  };
}

/** camelCase CRM input → that repo's snake_case `BlogPostIn`. */
function toInDto(input: BlogPostInput): BlogPostInDto {
  return {
    title: input.title,
    slug: input.slug,
    excerpt: input.excerpt,
    content: input.content,
    featured_image: input.featuredImage,
    author: input.author,
    category: input.category,
    tags: input.tags,
    status: input.status,
    seo_title: input.seoTitle,
    meta_description: input.metaDescription,
    canonical_url: input.canonicalUrl,
    og_image: input.ogImage,
  };
}

export const blogService = {
  isConfigured(): boolean {
    return websiteAdmin.isBlogConfigured();
  },

  async listPosts(actor: BlogActor, params: ListPostsParams): Promise<BlogPostListResult> {
    const data = await websiteAdmin.listPosts(actor, params);
    return {
      items: data.items.map(toListItem),
      total: data.total,
      page: data.page,
      perPage: data.per_page,
    };
  },

  async getPost(actor: BlogActor, id: string): Promise<BlogPostDetail> {
    return toDetail(await websiteAdmin.getPost(actor, id));
  },

  async createPost(actor: BlogActor, input: BlogPostInput) {
    return websiteAdmin.createPost(actor, toInDto(input));
  },

  async updatePost(actor: BlogActor, id: string, input: BlogPostInput) {
    return websiteAdmin.updatePost(actor, id, toInDto(input));
  },

  async setPostStatus(actor: BlogActor, id: string, publish: boolean) {
    return websiteAdmin.setPostStatus(actor, id, publish);
  },

  async deletePost(actor: BlogActor, id: string) {
    return websiteAdmin.deletePost(actor, id);
  },

  async checkSlug(actor: BlogActor, slug: string, excludeId?: string): Promise<BlogSlugCheck> {
    return websiteAdmin.checkSlug(actor, slug, excludeId);
  },

  async uploadImage(actor: BlogActor, file: UploadImageFile): Promise<BlogImageUploadResult> {
    const out = await websiteAdmin.uploadImage(actor, file);
    return {
      url: out.url,
      previewUrl: toAbsoluteImageUrl(out.url) ?? out.url,
      filename: out.filename,
    };
  },
};
