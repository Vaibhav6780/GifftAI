import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { createTaskSchema, type CreateTaskInput } from "@gifftai/shared";
import { useCreateTask } from "../../features/tasks/api";
import { useUsersList } from "../../features/users/api";
import { TASK_PRIORITY_OPTIONS, TASK_STATUS_OPTIONS, TASK_TYPE_OPTIONS } from "./constants";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Textarea } from "../../components/ui/Textarea";
import { Button } from "../../components/ui/Button";
import { toast } from "../../components/ui/Toast";
import { handleBulletListKeyDown } from "../../lib/bulletListTextarea";

export function TaskCreatePage() {
  const navigate = useNavigate();
  const createTask = useCreateTask();
  const { data: usersPage } = useUsersList({ pageSize: 100, sortBy: "firstName", sortOrder: "asc" });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateTaskInput>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: { type: "TASK", priority: "MEDIUM", status: "PENDING" },
  });

  const onSubmit = handleSubmit((data) => {
    createTask.mutate(data, {
      onSuccess: (task) => {
        toast.success("Task created");
        navigate(`/tasks/${task.id}`, { replace: true });
      },
      onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to create task"),
    });
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">New Task</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Create and assign a task.</p>
      </div>

      <Card className="max-w-2xl p-6">
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
            <Select label="Status" error={errors.status?.message} {...register("status")}>
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
                setValueAs: (v) => (v ? new Date(v).toISOString() : undefined),
              })}
            />
          </div>

          <Select
            label="Assign to"
            error={errors.assignedToId?.message}
            {...register("assignedToId", { setValueAs: (v) => v || undefined })}
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

          <div className="mt-2 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => navigate("/tasks")}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createTask.isPending}>
              Create task
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
