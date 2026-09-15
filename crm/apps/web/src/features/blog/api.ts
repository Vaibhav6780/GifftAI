import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  BlogConnectionStatus,
  BlogImageUploadResult,
  BlogPostDetail,
  BlogPostInput,
  BlogPostListResult,
  BlogSlugCheck,
  ListBlogPostsQuery,
} from "@gifftai/shared";
import { apiClient } from "../../lib/apiClient";
import { unwrap } from "../../lib/unwrap";

const LIST_KEY = ["blog", "posts"] as const;

export function useBlogStatus() {
  return useQuery({
    queryKey: ["blog", "status"],
    queryFn: () => unwrap<BlogConnectionStatus>(apiClient.get("/blog/status")),
  });
}

export function useBlogPosts(query: ListBlogPostsQuery) {
  return useQuery({
    queryKey: [...LIST_KEY, query],
    queryFn: () => unwrap<BlogPostListResult>(apiClient.get("/blog", { params: query })),
  });
}

export function useBlogPost(id: string | null) {
  return useQuery({
    queryKey: ["blog", "post", id],
    enabled: Boolean(id),
    queryFn: () => unwrap<BlogPostDetail>(apiClient.get(`/blog/${id}`)),
  });
}

export function useBlogSlugCheck(slug: string, excludeId: string | undefined, enabled: boolean) {
  const trimmed = slug.trim();
  return useQuery({
    queryKey: ["blog", "slug-check", trimmed, excludeId ?? null],
    enabled: enabled && trimmed.length > 0,
    staleTime: 10_000,
    queryFn: () =>
      unwrap<BlogSlugCheck>(
        apiClient.get("/blog/slug-check", {
          params: { slug: trimmed, ...(excludeId ? { id: excludeId } : {}) },
        }),
      ),
  });
}

export function useCreateBlogPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: BlogPostInput) =>
      unwrap<{ message: string; id: string; slug: string }>(apiClient.post("/blog", body)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

export function useUpdateBlogPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: BlogPostInput }) =>
      unwrap<{ message: string; slug: string }>(apiClient.put(`/blog/${id}`, body)),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: LIST_KEY });
      void queryClient.invalidateQueries({ queryKey: ["blog", "post", id] });
    },
  });
}

export function useSetBlogPostStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, publish }: { id: string; publish: boolean }) =>
      unwrap<{ message: string; status: string }>(
        apiClient.post(`/blog/${id}/${publish ? "publish" : "unpublish"}`),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

export function useDeleteBlogPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unwrap<{ message: string }>(apiClient.delete(`/blog/${id}`)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

export function useUploadBlogImage() {
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return unwrap<BlogImageUploadResult>(apiClient.post("/blog/upload", form));
    },
  });
}
