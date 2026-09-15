import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  BulkCreateTasksInput,
  CreateTaskCommentInput,
  CreateTaskInput,
  ListTasksQuery,
  PaginatedResult,
  TaskActivityEntry,
  TaskComment,
  TaskDetail,
  TaskSummary,
  UpdateTaskInput,
} from "@gifftai/shared";
import { apiClient } from "../../lib/apiClient";
import { unwrap } from "../../lib/unwrap";

const LIST_KEY = ["tasks"] as const;
const detailKey = (id: string) => ["tasks", id] as const;

export function useTasksList(query: Partial<ListTasksQuery>) {
  return useQuery({
    queryKey: [...LIST_KEY, query],
    queryFn: () => unwrap<PaginatedResult<TaskSummary>>(apiClient.get("/tasks", { params: query })),
  });
}

export function useTask(id: string | undefined) {
  return useQuery({
    queryKey: detailKey(id ?? ""),
    queryFn: () => unwrap<TaskDetail>(apiClient.get(`/tasks/${id}`)),
    enabled: Boolean(id),
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTaskInput) => unwrap<TaskDetail>(apiClient.post("/tasks", input)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

export function useUpdateTask(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateTaskInput) => unwrap<TaskDetail>(apiClient.patch(`/tasks/${id}`, input)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIST_KEY });
      queryClient.invalidateQueries({ queryKey: detailKey(id) });
    },
  });
}

export function useBulkAssignTasks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BulkCreateTasksInput) =>
      unwrap<TaskDetail[]>(apiClient.post("/tasks/bulk-assign", input)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unwrap<null>(apiClient.delete(`/tasks/${id}`)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

export function useTaskActivity(id: string | undefined) {
  return useQuery({
    queryKey: [...detailKey(id ?? ""), "activity"],
    queryFn: () => unwrap<TaskActivityEntry[]>(apiClient.get(`/tasks/${id}/activity`)),
    enabled: Boolean(id),
  });
}

export function useAddTaskComment(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTaskCommentInput) => unwrap<TaskComment>(apiClient.post(`/tasks/${id}/comments`, input)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...detailKey(id), "activity"] });
    },
  });
}
