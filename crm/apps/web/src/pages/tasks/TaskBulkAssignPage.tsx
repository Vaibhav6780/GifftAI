import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import { bulkCreateTasksSchema, type BulkCreateTasksInput } from "@gifftai/shared";
import { useBulkAssignTasks } from "../../features/tasks/api";
import { useUsersList } from "../../features/users/api";
import { TASK_PRIORITY_OPTIONS } from "./constants";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Textarea } from "../../components/ui/Textarea";
import { Button } from "../../components/ui/Button";
import { toast } from "../../components/ui/Toast";
import { handleBulletListKeyDown } from "../../lib/bulletListTextarea";

const EMPTY_TASK_ROW: BulkCreateTasksInput["tasks"][number] = {
  title: "",
  description: undefined,
  priority: "MEDIUM",
  dueAt: undefined,
};

const MAX_TASKS = 50;

export function TaskBulkAssignPage() {
  const navigate = useNavigate();
  const bulkAssign = useBulkAssignTasks();

  const { data: usersPage } = useUsersList({ pageSize: 100, sortBy: "firstName", sortOrder: "asc" });

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<BulkCreateTasksInput>({
    resolver: zodResolver(bulkCreateTasksSchema),
    defaultValues: { assignedToId: "", tasks: [EMPTY_TASK_ROW] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "tasks" });

  const onSubmit = handleSubmit((data) => {
    bulkAssign.mutate(data, {
      onSuccess: (tasks) => {
        toast.success(`${tasks.length} task${tasks.length === 1 ? "" : "s"} created`);
        navigate("/tasks");
      },
      onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to create tasks"),
    });
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Bulk Assign Tasks</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Create multiple tasks at once and assign them all to one employee.
        </p>
      </div>

      <Card className="max-w-4xl p-6">
        <form className="flex flex-col gap-6" onSubmit={onSubmit} noValidate>
          <Select label="Assign to" error={errors.assignedToId?.message} {...register("assignedToId")}>
            <option value="">Select an employee</option>
            {usersPage?.items.map((u) => (
              <option key={u.id} value={u.id}>
                {u.firstName} {u.lastName}
              </option>
            ))}
          </Select>

          <div className="flex flex-col gap-4">
            {fields.map((field, index) => (
              <Card key={field.id} className="flex flex-col gap-4 border-slate-100 p-4 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Task {index + 1}</h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                  >
                    <Trash2 size={14} /> Remove
                  </Button>
                </div>

                <Input
                  label="Title"
                  error={errors.tasks?.[index]?.title?.message}
                  {...register(`tasks.${index}.title`)}
                />

                <Textarea
                  label="Description"
                  rows={2}
                  placeholder={"• Add a bullet point and press Enter for the next one"}
                  error={errors.tasks?.[index]?.description?.message}
                  {...register(`tasks.${index}.description`, { setValueAs: (v) => v || undefined })}
                  onKeyDown={handleBulletListKeyDown}
                />

                <div className="grid grid-cols-2 gap-4">
                  <Select label="Priority" error={errors.tasks?.[index]?.priority?.message} {...register(`tasks.${index}.priority`)}>
                    {TASK_PRIORITY_OPTIONS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </Select>
                  <Input
                    label="Due date"
                    type="datetime-local"
                    error={errors.tasks?.[index]?.dueAt?.message}
                    {...register(`tasks.${index}.dueAt`, {
                      setValueAs: (v) => (v ? new Date(v).toISOString() : undefined),
                    })}
                  />
                </div>
              </Card>
            ))}
          </div>

          <div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => append(EMPTY_TASK_ROW)}
              disabled={fields.length >= MAX_TASKS}
            >
              <Plus size={16} /> Add another task
            </Button>
            {errors.tasks?.message && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.tasks.message}</p>
            )}
          </div>

          <div className="mt-2 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => navigate("/tasks")}>
              Cancel
            </Button>
            <Button type="submit" isLoading={bulkAssign.isPending}>
              Save {fields.length} task{fields.length === 1 ? "" : "s"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
