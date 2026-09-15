import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useParams } from "react-router-dom";
import { updateTaskSchema, type UpdateTaskInput } from "@gifftai/shared";
import { useDeleteTask, useTask, useUpdateTask } from "../../features/tasks/api";
import { useUsersList } from "../../features/users/api";
import { TASK_PRIORITY_OPTIONS, TASK_PRIORITY_VARIANT, TASK_STATUS_OPTIONS, TASK_STATUS_VARIANT, TASK_TYPE_OPTIONS } from "./constants";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Textarea } from "../../components/ui/Textarea";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { PageSpinner } from "../../components/ui/Spinner";
import { ErrorState } from "../../components/ui/ErrorState";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { toast } from "../../components/ui/Toast";
import { useHasPermission, useIsAssignedOrPrivileged } from "../../hooks/usePermission";
import { TaskActivityLog } from "../../features/tasks/components/TaskActivityLog";
import { handleBulletListKeyDown } from "../../lib/bulletListTextarea";

function toLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const offsetMs = d.getTimezoneOffset() * 60 * 1000;
  return new Date(d.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function TaskEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const canDelete = useHasPermission("tasks:delete");

  const { data: task, isLoading, isError, refetch } = useTask(id);
  const canManageStatus = useIsAssignedOrPrivileged(task?.assignedToId);
  const { data: usersPage } = useUsersList({ pageSize: 100, sortBy: "firstName", sortOrder: "asc" });

  const updateTask = useUpdateTask(id!);
  const deleteTask = useDeleteTask();

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateTaskInput>({ resolver: zodResolver(updateTaskSchema) });

  useEffect(() => {
    if (!task) return;
    reset({
      title: task.title,
      description: task.description,
      type: task.type,
      priority: task.priority,
      status: task.status,
      dueAt: toLocalInputValue(task.dueAt),
      assignedToId: task.assignedToId,
    });
  }, [task, reset]);

  if (isLoading) return <PageSpinner />;
  if (isError || !task) return <ErrorState description="Couldn't load this task." onRetry={() => refetch()} />;

  const onSubmit = handleSubmit((data) => {
    updateTask.mutate(data, {
      onSuccess: () => toast.success("Task updated"),
      onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to update task"),
    });
  });

  function handleDelete() {
    deleteTask.mutate(id!, {
      onSuccess: () => {
        toast.success("Task deleted");
        navigate("/tasks");
      },
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : "Failed to delete task");
        setConfirmDeleteOpen(false);
      },
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{task.title}</h1>
        <div className="flex items-center gap-2">
          <Badge variant={TASK_PRIORITY_VARIANT[task.priority]}>{task.priority}</Badge>
          <Badge variant={TASK_STATUS_VARIANT[task.status]}>{task.status.replace("_", " ")}</Badge>
        </div>
      </div>

      <Card className="max-w-2xl p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Details</h2>
        <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
          <Input label="Title" error={errors.title?.message} {...register("title")} />

          <div className="grid grid-cols-2 gap-4">
            <Select label="Type" error={errors.type?.message} {...register("type")}>
              {TASK_TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t.replace("_", " ")}
                </option>
              ))}
            </Select>
            <Select label="Priority" error={errors.priority?.message} {...register("priority")}>
              {TASK_PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Status"
              disabled={!canManageStatus}
              title={canManageStatus ? undefined : "Only the assigned user or an admin can change status"}
              error={errors.status?.message}
              {...register("status")}
            >
              {TASK_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s.replace("_", " ")}
                </option>
              ))}
            </Select>
            <Input
              label="Due date"
              type="datetime-local"
              error={errors.dueAt?.message}
              {...register("dueAt", {
                setValueAs: (v) => (v ? new Date(v).toISOString() : null),
              })}
            />
          </div>

          <Select
            label="Assign to"
            error={errors.assignedToId?.message}
            {...register("assignedToId", { setValueAs: (v) => v || null })}
          >
            <option value="">Unassigned</option>
            {usersPage?.items.map((u) => (
              <option key={u.id} value={u.id}>
                {u.firstName} {u.lastName}
              </option>
            ))}
          </Select>

          <Textarea
            label="Description"
            rows={4}
            placeholder={"• Add a bullet point and press Enter for the next one"}
            error={errors.description?.message}
            {...register("description")}
            onKeyDown={handleBulletListKeyDown}
          />

          <div className="flex justify-end">
            <Button type="submit" isLoading={updateTask.isPending}>
              Save changes
            </Button>
          </div>
        </form>
      </Card>

      <TaskActivityLog taskId={id!} canComment={canManageStatus} />

      {canDelete && (
        <Card className="max-w-2xl p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Danger zone</h2>
          <Button variant="danger" onClick={() => setConfirmDeleteOpen(true)}>
            Delete task
          </Button>
        </Card>
      )}

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Delete task"
        description={`Are you sure you want to delete "${task.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        isLoading={deleteTask.isPending}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </div>
  );
}
