import { useState } from "react";
import { Link } from "react-router-dom";
import { ListTodo } from "lucide-react";
import type { TaskStatus } from "@gifftai/shared";
import { useTasksList } from "../../features/tasks/api";
import { TASK_PRIORITY_VARIANT, TASK_STATUS_VARIANT } from "../tasks/constants";
import { Modal } from "../../components/ui/Modal";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { PageSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { Table, Tbody, Td, Th, Thead, Tr } from "../../components/ui/Table";

/** "OVERDUE" isn't a TaskStatus — it maps to the `overdue` query flag instead of `status`. */
export type TaskSummaryFilter = TaskStatus | "OVERDUE";

interface UserTasksModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  filter: TaskSummaryFilter;
  label: string;
}

/** UTC calendar day, matching the gte/lte day-range the backend filters `createdAt` by. */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function UserTasksModal({ open, onClose, userId, userName, filter, label }: UserTasksModalProps) {
  // Defaults to today's tasks, same as the main Tasks list page — "all" is the escape hatch.
  const [createdDate, setCreatedDate] = useState(todayIso());
  const isAllDates = createdDate === "all";

  const { data, isLoading, isError, refetch } = useTasksList({
    assignedToId: userId,
    pageSize: 100,
    sortBy: "dueAt",
    sortOrder: "asc",
    createdDate: isAllDates ? undefined : createdDate,
    ...(filter === "OVERDUE" ? { overdue: true } : { status: filter }),
  });

  return (
    <Modal open={open} onClose={onClose} title={`${userName} — ${label} tasks`} className="max-w-3xl">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Input
            type="date"
            aria-label="Created date"
            className="w-40"
            value={isAllDates ? "" : createdDate}
            onChange={(e) => setCreatedDate(e.target.value || "all")}
          />
          {!isAllDates && (
            <Button variant="secondary" size="sm" onClick={() => setCreatedDate("all")}>
              All dates
            </Button>
          )}
        </div>
        {isLoading ? (
          <PageSpinner />
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : data?.items.length === 0 ? (
          <EmptyState
            icon={ListTodo}
            title="No tasks"
            description={`${userName} has no ${label.toLowerCase()} tasks${isAllDates ? "" : " created today"}.`}
          />
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Title</Th>
                <Th>Priority</Th>
                <Th>Due</Th>
                <Th>Related</Th>
                <Th>Status</Th>
                <Th />
              </Tr>
            </Thead>
            <Tbody>
              {data?.items.map((task) => (
                <Tr key={task.id}>
                  <Td className="max-w-56 truncate">{task.title}</Td>
                  <Td>
                    <Badge variant={TASK_PRIORITY_VARIANT[task.priority]}>{task.priority}</Badge>
                  </Td>
                  <Td>{task.dueAt ? new Date(task.dueAt).toLocaleDateString() : "—"}</Td>
                  <Td>{task.leadName ?? task.contactName ?? "—"}</Td>
                  <Td>
                    <Badge variant={TASK_STATUS_VARIANT[task.status]}>{task.status.replace("_", " ")}</Badge>
                  </Td>
                  <Td>
                    <Link to={`/tasks/${task.id}`}>
                      <Button variant="ghost" size="sm">
                        Open
                      </Button>
                    </Link>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}

        <div className="flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
