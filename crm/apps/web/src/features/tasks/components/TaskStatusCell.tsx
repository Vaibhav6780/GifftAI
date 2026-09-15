import type { TaskStatus } from "@gifftai/shared";
import { useUpdateTask } from "../api";
import { TASK_STATUS_OPTIONS, TASK_STATUS_VARIANT } from "../../../pages/tasks/constants";
import { useIsAssignedOrPrivileged } from "../../../hooks/usePermission";
import { Badge } from "../../../components/ui/Badge";
import { Select } from "../../../components/ui/Select";
import { toast } from "../../../components/ui/Toast";

export function TaskStatusCell({
  taskId,
  assignedToId,
  status,
}: {
  taskId: string;
  assignedToId: string | null;
  status: TaskStatus;
}) {
  const canManage = useIsAssignedOrPrivileged(assignedToId);
  const updateTask = useUpdateTask(taskId);

  if (!canManage) return <Badge variant={TASK_STATUS_VARIANT[status]}>{status.replace("_", " ")}</Badge>;

  return (
    <Select
      className="w-40"
      value={status}
      disabled={updateTask.isPending}
      onChange={(e) => {
        updateTask.mutate(
          { status: e.target.value as TaskStatus },
          {
            onSuccess: () => toast.success("Status updated"),
            onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to update status"),
          },
        );
      }}
    >
      {TASK_STATUS_OPTIONS.map((s) => (
        <option key={s} value={s}>
          {s.replace("_", " ")}
        </option>
      ))}
    </Select>
  );
}
