import { useEffect, useMemo, useRef, useState } from "react";
import {
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import type { BlogPostInput, BlogPostStatus } from "@gifftai/shared";
import {
  useBlogPost,
  useBlogPosts,
  useBlogSlugCheck,
  useBlogStatus,
  useCreateBlogPost,
  useDeleteBlogPost,
  useSetBlogPostStatus,
  useUpdateBlogPost,
  useUploadBlogImage,
} from "../../features/blog/api";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { Modal } from "../../components/ui/Modal";
import { PageSpinner } from "../../components/ui/Spinner";
import { Table, Tbody, Td, Th, Thead, Tr } from "../../components/ui/Table";
import { toast } from "../../components/ui/Toast";
import { useHasPermission } from "../../hooks/usePermission";
import { renderMarkdownPreview, slugify } from "./markdownPreview";

const SITE_URL = (import.meta.env.VITE_WEBSITE_PUBLIC_URL ?? "https://gifftai.com").replace(
  /\/$/,
  "",
);

type StatusFilter = "all" | "draft" | "published";

function resolveImg(stored: string): string {
  if (!stored) return "";
  if (/^https?:\/\//i.test(stored)) return stored;
  return `${SITE_URL}${stored.startsWith("/") ? "" : "/"}${stored}`;
}

const EMPTY_FORM = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  featuredImage: "",
  author: "",
  category: "",
  tags: "",
  status: "draft" as BlogPostStatus,
  seoTitle: "",
  metaDescription: "",
  canonicalUrl: "",
  ogImage: "",
};
type Form = typeof EMPTY_FORM;

function toInput(f: Form): BlogPostInput {
  return {
    title: f.title.trim(),
    slug: f.slug.trim() || undefined,
    excerpt: f.excerpt.trim() || null,
    content: f.content,
    featuredImage: f.featuredImage.trim() || null,
    author: f.author.trim() || null,
    category: f.category.trim() || null,
    tags: f.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    status: f.status === "published" ? "published" : "draft",
    seoTitle: f.seoTitle.trim() || null,
    metaDescription: f.metaDescription.trim() || null,
    canonicalUrl: f.canonicalUrl.trim() || null,
    ogImage: f.ogImage.trim() || null,
  };
}

export function BlogListPage() {
  const canManage = useHasPermission("blog:manage");

  const [filter, setFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: connection } = useBlogStatus();
  const connected = connection?.connected ?? true;

  const { data, isLoading, isError, error, refetch, isFetching } = useBlogPosts({
    status: filter === "all" ? undefined : filter,
    q: debouncedSearch || undefined,
  });
  const posts = data?.items ?? [];

  const setStatusMutation = useSetBlogPostStatus();
  const deleteMutation = useDeleteBlogPost();

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  function openCreate() {
    setEditId(null);
    setModalOpen(true);
  }
  function openEdit(id: string) {
    setEditId(id);
    setModalOpen(true);
  }

  function handleSetStatus(id: string, publish: boolean) {
    setStatusMutation.mutate(
      { id, publish },
      {
        onSuccess: () => toast.success(publish ? "Published" : "Unpublished"),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
      },
    );
  }

  function handleDelete() {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId, {
      onSuccess: () => {
        toast.success("Post deleted");
        setDeleteId(null);
      },
      onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to delete"),
    });
  }

  const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString() : "—");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Blog</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Published posts appear automatically at <strong>gifftai.com/blog</strong>. Drafts are
            never public. Managed here or in admin.gifftai.com — same posts either way.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {canManage && connected && (
            <Button size="sm" onClick={openCreate}>
              <Plus size={16} /> New Post
            </Button>
          )}
          <Button size="sm" variant="secondary" onClick={() => refetch()} aria-label="Refresh">
            <RefreshCw size={16} className={isFetching ? "animate-spin" : undefined} />
          </Button>
        </div>
      </div>

      {!connected ? (
        <Card className="p-6">
          <EmptyState
            icon={FileText}
            title="Blog isn't connected"
            description="Set WEBSITE_ADMIN_API_URL and WEBSITE_ADMIN_SERVICE_KEY on the CRM API to manage gifftai.com blog posts from here."
          />
        </Card>
      ) : (
        <>
          <Card className="flex flex-wrap items-center gap-2 p-4">
            {(["all", "draft", "published"] as StatusFilter[]).map((f) => (
              <Button
                key={f}
                size="sm"
                variant={filter === f ? "primary" : "secondary"}
                className="capitalize"
                onClick={() => setFilter(f)}
              >
                {f}
              </Button>
            ))}
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title / slug…"
              className="ml-auto w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 sm:w-64 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </Card>

          {isLoading ? (
            <PageSpinner />
          ) : isError ? (
            <Card className="p-6">
              <ErrorState
                description={
                  error instanceof Error && error.message
                    ? error.message
                    : "Something went wrong loading the blog posts."
                }
                onRetry={() => refetch()}
              />
            </Card>
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>Title</Th>
                  <Th className="hidden md:table-cell">Category</Th>
                  <Th>Status</Th>
                  <Th className="hidden sm:table-cell">Published</Th>
                  <Th className="text-right">Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {posts.map((p) => (
                  <Tr key={p.id}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded bg-slate-100 dark:bg-slate-800">
                          {p.featuredImageUrl ? (
                            <img
                              src={p.featuredImageUrl}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <ImageIcon size={14} className="text-slate-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-medium text-slate-900 dark:text-slate-100">
                            {p.title}
                          </div>
                          <div className="flex items-center gap-1 truncate text-xs text-slate-500 dark:text-slate-400">
                            /blog/{p.slug}
                            {p.status === "published" && (
                              <a
                                href={`${SITE_URL}/blog/${p.slug}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex text-brand-600 hover:underline"
                                title="Open live"
                              >
                                <ExternalLink size={11} />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </Td>
                    <Td className="hidden md:table-cell">{p.category || "—"}</Td>
                    <Td>
                      <Badge
                        variant={p.status === "published" ? "success" : "neutral"}
                        className="capitalize"
                      >
                        {p.status}
                      </Badge>
                    </Td>
                    <Td className="hidden sm:table-cell text-slate-500 dark:text-slate-400">
                      {fmtDate(p.publishedAt)}
                    </Td>
                    <Td>
                      <div className="flex items-center justify-end gap-1.5">
                        {canManage && (
                          <>
                            {p.status === "published" ? (
                              <button
                                type="button"
                                onClick={() => handleSetStatus(p.id, false)}
                                disabled={setStatusMutation.isPending}
                                className="rounded-md border border-amber-300 p-1.5 text-amber-600 transition-colors hover:bg-amber-50 disabled:opacity-50 dark:border-amber-500/30 dark:hover:bg-amber-500/10"
                                title="Unpublish"
                              >
                                <EyeOff size={13} />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSetStatus(p.id, true)}
                                disabled={setStatusMutation.isPending}
                                className="rounded-md border border-emerald-300 p-1.5 text-emerald-600 transition-colors hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-500/30 dark:hover:bg-emerald-500/10"
                                title="Publish"
                              >
                                <Eye size={13} />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => openEdit(p.id)}
                              className="rounded-md border border-slate-300 p-1.5 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                              title="Edit"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteId(p.id)}
                              className="rounded-md border border-red-300 p-1.5 text-red-600 transition-colors hover:bg-red-50 dark:border-red-500/30 dark:hover:bg-red-500/10"
                              title="Delete"
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </Td>
                  </Tr>
                ))}
                {posts.length === 0 && (
                  <Tr>
                    <Td colSpan={5}>
                      <EmptyState
                        icon={FileText}
                        title="No posts"
                        description="No blog posts match this filter."
                      />
                    </Td>
                  </Tr>
                )}
              </Tbody>
            </Table>
          )}
        </>
      )}

      {modalOpen && (
        <BlogPostModal
          key={editId ?? "new"}
          editId={editId}
          canManage={canManage}
          onClose={() => setModalOpen(false)}
        />
      )}

      <ConfirmDialog
        open={deleteId !== null}
        title="Delete post"
        description="Permanently delete this post and its uploaded images? This cannot be undone."
        confirmLabel="Delete"
        isLoading={deleteMutation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

// ── create / edit modal ─────────────────────────────────────────────
interface BlogPostModalProps {
  editId: string | null;
  canManage: boolean;
  onClose: () => void;
}

function BlogPostModal({ editId, canManage, onClose }: BlogPostModalProps) {
  const [form, setForm] = useState<Form>({ ...EMPTY_FORM });
  const [slugEdited, setSlugEdited] = useState(Boolean(editId));
  const [tab, setTab] = useState<"content" | "seo" | "preview">("content");
  const [debouncedSlug, setDebouncedSlug] = useState("");
  const featuredRef = useRef<HTMLInputElement>(null);
  const ogRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<"featured" | "og" | null>(null);

  const { data: post, isLoading: loadingPost } = useBlogPost(editId);
  const createMutation = useCreateBlogPost();
  const updateMutation = useUpdateBlogPost();
  const uploadMutation = useUploadBlogImage();
  const saving = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (!post) return;
    setForm({
      title: post.title ?? "",
      slug: post.slug ?? "",
      excerpt: post.excerpt ?? "",
      content: post.content ?? "",
      featuredImage: post.featuredImage ?? "",
      author: post.author ?? "",
      category: post.category ?? "",
      tags: (post.tags ?? []).join(", "),
      status: post.status,
      seoTitle: post.seoTitle ?? "",
      metaDescription: post.metaDescription ?? "",
      canonicalUrl: post.canonicalUrl ?? "",
      ogImage: post.ogImage ?? "",
    });
    setSlugEdited(true);
  }, [post]);

  const effectiveSlug = (form.slug || slugify(form.title)).trim();
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSlug(effectiveSlug), 350);
    return () => clearTimeout(t);
  }, [effectiveSlug]);
  const slugCheck = useBlogSlugCheck(debouncedSlug, editId ?? undefined, true);

  const set = (k: keyof Form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const onTitle = (v: string) =>
    setForm((f) => ({ ...f, title: v, slug: slugEdited ? f.slug : slugify(v) }));

  async function pickImage(e: React.ChangeEvent<HTMLInputElement>, field: "featured" | "og") {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file");
      return;
    }
    setUploading(field);
    try {
      const out = await uploadMutation.mutateAsync(file);
      set(field === "featured" ? "featuredImage" : "ogImage", out.url);
      toast.success("Image uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  }

  function handleSubmit() {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!form.content.trim()) {
      toast.error("Content is required");
      return;
    }
    const body = toInput(form);
    if (editId) {
      updateMutation.mutate(
        { id: editId, body },
        {
          onSuccess: () => {
            toast.success("Post saved");
            onClose();
          },
          onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to save"),
        },
      );
    } else {
      createMutation.mutate(body, {
        onSuccess: () => {
          toast.success("Post created");
          onClose();
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to create"),
      });
    }
  }

  const previewHtml = useMemo(
    () => (tab === "preview" ? renderMarkdownPreview(form.content) : ""),
    [tab, form.content],
  );

  const inputCls =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";
  const labelCls = "mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400";

  return (
    <Modal open onClose={onClose} title={editId ? "Edit Post" : "New Post"} className="max-w-3xl">
      {loadingPost ? (
        <PageSpinner />
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800">
            {(["content", "seo", "preview"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={
                  "-mb-px border-b-2 px-3 py-2 text-sm font-medium capitalize transition-colors " +
                  (tab === t
                    ? "border-brand-500 text-brand-600 dark:text-brand-500"
                    : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")
                }
              >
                {t}
              </button>
            ))}
          </div>

          <div className="max-h-[65vh] space-y-3 overflow-y-auto pr-1">
            {tab === "content" && (
              <>
                <div>
                  <label className={labelCls}>Title</label>
                  <input
                    className={inputCls}
                    value={form.title}
                    onChange={(e) => onTitle(e.target.value)}
                    placeholder="Article title"
                  />
                </div>

                <div>
                  <label className={labelCls}>Slug</label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">/blog/</span>
                    <input
                      className={inputCls}
                      value={form.slug}
                      onChange={(e) => {
                        setSlugEdited(true);
                        set("slug", e.target.value);
                      }}
                      placeholder="auto-generated-from-title"
                    />
                  </div>
                  {debouncedSlug && slugCheck.data && (
                    <p
                      className={
                        "mt-1 text-xs " +
                        (slugCheck.data.available ? "text-emerald-600" : "text-amber-600")
                      }
                    >
                      {slugCheck.data.available
                        ? "Slug available"
                        : `Taken — will be saved as "${slugCheck.data.suggestion}"`}
                      {!slugCheck.data.available && (
                        <button
                          type="button"
                          className="ml-2 underline"
                          onClick={() => {
                            setSlugEdited(true);
                            set("slug", slugCheck.data!.suggestion);
                          }}
                        >
                          use it
                        </button>
                      )}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>Author (byline)</label>
                    <input
                      className={inputCls}
                      value={form.author}
                      onChange={(e) => set("author", e.target.value)}
                      placeholder="Defaults to your name"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Category</label>
                    <input
                      className={inputCls}
                      value={form.category}
                      onChange={(e) => set("category", e.target.value)}
                      placeholder="e.g. Forex, Strategy, Product"
                    />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Tags (comma-separated)</label>
                  <input
                    className={inputCls}
                    value={form.tags}
                    onChange={(e) => set("tags", e.target.value)}
                    placeholder="eurusd, risk-management"
                  />
                </div>

                <div>
                  <label className={labelCls}>Excerpt</label>
                  <textarea
                    className={inputCls + " resize-y"}
                    value={form.excerpt}
                    onChange={(e) => set("excerpt", e.target.value)}
                    rows={2}
                    maxLength={320}
                    placeholder="1–2 sentence summary shown on cards and used as the meta description fallback"
                  />
                  <p className="mt-0.5 text-xs text-slate-400">{form.excerpt.length}/320</p>
                </div>

                <div>
                  <label className={labelCls}>Featured image — recommended 1200 × 630 px</label>
                  <input
                    ref={featuredRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => pickImage(e, "featured")}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={uploading === "featured"}
                      onClick={() => featuredRef.current?.click()}
                    >
                      {uploading === "featured" ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Upload size={14} />
                      )}
                      Choose file
                    </Button>
                    {form.featuredImage && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => set("featuredImage", "")}
                      >
                        <Trash2 size={14} /> Remove
                      </Button>
                    )}
                    <input
                      className={inputCls + " flex-1"}
                      value={form.featuredImage}
                      onChange={(e) => set("featuredImage", e.target.value)}
                      placeholder="/api/v1/blog/media/… or https://…"
                    />
                  </div>
                  {form.featuredImage && (
                    <div className="mt-2 aspect-video max-w-sm overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800">
                      <img
                        src={resolveImg(form.featuredImage)}
                        alt="Preview"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  <p className="mt-1 text-xs text-slate-400">
                    After saving, a removed image can take a few minutes to disappear from the live
                    site (page cache).
                  </p>
                </div>

                <div>
                  <label className={labelCls}>Content (Markdown)</label>
                  <textarea
                    className={inputCls + " resize-y font-mono"}
                    value={form.content}
                    onChange={(e) => set("content", e.target.value)}
                    rows={14}
                    placeholder={
                      "## Heading\n\nParagraph with **bold**, *italic*, [links](https://gifftai.com).\n\n- bullet\n- points"
                    }
                  />
                </div>
              </>
            )}

            {tab === "seo" && (
              <>
                <div>
                  <label className={labelCls}>SEO title</label>
                  <input
                    className={inputCls}
                    value={form.seoTitle}
                    onChange={(e) => set("seoTitle", e.target.value)}
                    maxLength={200}
                    placeholder={form.title || "Falls back to the post title"}
                  />
                </div>
                <div>
                  <label className={labelCls}>Meta description</label>
                  <textarea
                    className={inputCls + " resize-y"}
                    value={form.metaDescription}
                    onChange={(e) => set("metaDescription", e.target.value)}
                    rows={3}
                    maxLength={320}
                    placeholder={form.excerpt || "Falls back to the excerpt"}
                  />
                  <p className="mt-0.5 text-xs text-slate-400">
                    {form.metaDescription.length}/320 — ~160 shows in Google
                  </p>
                </div>
                <div>
                  <label className={labelCls}>Canonical URL (optional override)</label>
                  <input
                    className={inputCls}
                    value={form.canonicalUrl}
                    onChange={(e) => set("canonicalUrl", e.target.value)}
                    placeholder={`Leave blank → ${SITE_URL}/blog/<slug>`}
                  />
                </div>
                <div>
                  <label className={labelCls}>OG / social image — recommended 1200 × 630 px</label>
                  <input
                    ref={ogRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => pickImage(e, "og")}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={uploading === "og"}
                      onClick={() => ogRef.current?.click()}
                    >
                      {uploading === "og" ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Upload size={14} />
                      )}
                      Choose file
                    </Button>
                    {form.ogImage && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => set("ogImage", "")}
                      >
                        <Trash2 size={14} /> Remove
                      </Button>
                    )}
                    <input
                      className={inputCls + " flex-1"}
                      value={form.ogImage}
                      onChange={(e) => set("ogImage", e.target.value)}
                      placeholder="Leave blank → uses the featured image"
                    />
                  </div>
                  {(form.ogImage || form.featuredImage) && (
                    <div className="mt-2 max-w-sm overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
                      <div className="aspect-[1200/630] bg-slate-100 dark:bg-slate-800">
                        <img
                          src={resolveImg(form.ogImage || form.featuredImage)}
                          alt="OG preview"
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="border-t border-slate-200 p-2 dark:border-slate-800">
                        <div className="text-xs uppercase text-slate-400">gifftai.com</div>
                        <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                          {form.seoTitle || form.title || "Post title"}
                        </div>
                        <div className="line-clamp-2 text-xs text-slate-500">
                          {form.metaDescription || form.excerpt}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {tab === "preview" && (
              <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                <h2 className="mb-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {form.title || "Untitled"}
                </h2>
                <p className="mb-4 text-xs text-slate-400">
                  Approximate preview. On gifftai.com the title is the big page heading;
                  <code className="mx-1 rounded bg-slate-100 px-1 dark:bg-slate-800">##</code>
                  and
                  <code className="mx-1 rounded bg-slate-100 px-1 dark:bg-slate-800">###</code>
                  become uppercase section headings. Raw HTML is stripped.
                </p>
                <div
                  className="space-y-3 text-sm text-slate-600 dark:text-slate-300 [&_a]:text-brand-600 [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-slate-300 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-slate-400 [&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1 dark:[&_code]:bg-slate-800 [&_h1]:mt-5 [&_h1]:text-xl [&_h1]:font-bold [&_h1]:uppercase [&_h1]:tracking-tight [&_h1]:text-slate-900 dark:[&_h1]:text-slate-100 [&_h2]:mt-5 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:uppercase [&_h2]:tracking-tight [&_h2]:text-slate-900 dark:[&_h2]:text-slate-100 [&_h3]:mt-4 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:uppercase [&_h3]:tracking-tight [&_h3]:text-slate-900 dark:[&_h3]:text-slate-100 [&_hr]:my-6 [&_hr]:border-slate-200 dark:[&_hr]:border-slate-700 [&_ol]:list-decimal [&_ol]:pl-5 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-slate-100 [&_pre]:p-2 [&_pre]:text-xs dark:[&_pre]:bg-slate-800 [&_strong]:font-semibold [&_strong]:text-slate-900 dark:[&_strong]:text-slate-100 [&_table]:w-full [&_table]:text-xs [&_th]:border-b [&_th]:border-slate-200 [&_th]:py-1.5 [&_th]:text-left dark:[&_th]:border-slate-700 [&_td]:border-b [&_td]:border-slate-100 [&_td]:py-1.5 dark:[&_td]:border-slate-800 [&_ul]:list-disc [&_ul]:pl-5"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={form.status === "published"}
                onChange={(e) => set("status", e.target.checked ? "published" : "draft")}
                className="rounded"
              />
              {form.status === "published" ? "Published (live on gifftai.com/blog)" : "Draft"}
            </label>
            <div className="ml-auto flex items-center gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                <X size={14} /> Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                isLoading={saving}
                disabled={!canManage}
                onClick={handleSubmit}
              >
                {editId ? "Save" : "Create"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
