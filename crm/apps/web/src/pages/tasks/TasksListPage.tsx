import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ListPlus, ListTodo, NotebookPen, Plus, Search, Users } from "lucide-react";
import type { TaskPriority, TaskStatus } from "@gifftai/shared";
import { useDeleteTask, useTasksList } from "../../features/tasks/api";
import { TaskStatusCell } from "../../features/tasks/components/TaskStatusCell";
import { useUsersList } from "../../features/users/api";
import { TASK_PRIORITY_OPTIONS, TASK_PRIORITY_VARIANT, TASK_STATUS_OPTIONS } from "./constants";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Badge } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import { PageSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { Table, Tbody, Td, Th, Thead, Tr } from "../../components/ui/Table";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { toast } from "../../components/ui/Toast";
import { useHasPermission } from "../../hooks/usePermission";

/** UTC calendar day, matching the gte/lte day-range the backend filters `createdAt` by. */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Display-only: an overdue Pending/In Progress task reads as due "Today" instead of its
 *  original (past) due date, so the list doesn't accumulate a wall of stale-looking overdue
 *  rows. Purely a render decision — the underlying `dueAt` is never modified, so exports,
 *  the task detail page, and its history/audit trail all still show the real original date. */
function isRolledToToday(task: { status: TaskStatus; dueAt: string | null }): boolean {
  if (task.status !== "PENDING" && task.status !== "IN_PROGRESS") return false;
  if (!task.dueAt) return false;
  return new Date(task.dueAt).getTime() < new Date().setHours(0, 0, 0, 0);
}

export function TasksListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const canCreate = useHasPermission("tasks:create");
  const canDelete = useHasPermission("tasks:delete");
  const canViewTeamStatus = useHasPermission("users:read");
  const canViewTeamDayReports = useHasPermission("daily_reports:read");
  const { data: usersPage } = useUsersList({ pageSize: 100, sortBy: "firstName", sortOrder: "asc" });
  const deleteTask = useDeleteTask();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const page = Number(searchParams.get("page") ?? "1");
  const search = searchParams.get("search") ?? "";
  const status = (searchParams.get("status") ?? "") as TaskStatus | "";
  const priority = (searchParams.get("priority") ?? "") as TaskPriority | "";
  const assignedToId = searchParams.get("assignedToId") ?? "";
  // Absent param -> defaults to today; "all" is the explicit escape hatch to see every date.
  const createdDateParam = searchParams.get("createdDate");
  const isAllDates = createdDateParam === "all";
  const createdDate = isAllDates ? "" : (createdDateParam ?? todayIso());

  const { data, isLoading, isError, refetch } = useTasksList({
    page,
    pageSize: 20,
    search: search || undefined,
    status: status || undefined,
    priority: priority || undefined,
    assignedToId: assignedToId || undefined,
    createdDate: isAllDates ? undefined : createdDate,
  });

  const pendingTask = data?.items.find((t) => t.id === pendingDeleteId);

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.set("page", "1");
    setSearchParams(next);
  }

  function handleConfirmDelete() {
    if (!pendingDeleteId) return;
    deleteTask.mutate(pendingDeleteId, {
      onSuccess: () => {
        toast.success("Task deleted");
        setPendingDeleteId(null);
      },
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : "Failed to delete task");
        setPendingDeleteId(null);
      },
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Tasks</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Assign and track work across the team.</p>
        </div>
        <div className="flex gap-3">
          <Link to="/tasks/day-report">
            <Button variant="secondary">
              <NotebookPen size={16} /> Day Report
            </Button>
          </Link>
          {canViewTeamDayReports && (
            <Link to="/tasks/day-report/team">
              <Button variant="secondary">
                <NotebookPen size={16} /> Team Day Reports
              </Button>
            </Link>
          )}
          {canViewTeamStatus && (
            <Link to="/tasks/team">
              <Button variant="secondary">
                <Users size={16} /> Team Status
              </Button>
            </Link>
          )}
          {canCreate && (
            <>
              <Link to="/tasks/bulk-assign">
                <Button variant="secondary">
                  <ListPlus size={16} /> Bulk Assign Tasks
                </Button>
              </Link>
              <Link to="/tasks/new">
                <Button>
                  <Plus size={16} /> New Task
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      <Card className="flex flex-wrap gap-3 p-4">
        <div className="relative flex-1 min-w-56">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <Input
            placeholder="Search by title"
            defaultValue={search}
            className="pl-9"
            onChange={(e) => updateParam("search", e.target.value)}
          />
        </div>
        <Select className="w-44" value={status} onChange={(e) => updateParam("status", e.target.value)}>
          <option value="">All statuses</option>
          {TASK_STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ")}
            </option>
          ))}
        </Select>
        <Select className="w-40" value={priority} onChange={(e) => updateParam("priority", e.target.value)}>
          <option value="">All priorities</option>
          {TASK_PRIORITY_OPTIONS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </Select>
        <Select className="w-48" value={assignedToId} onChange={(e) => updateParam("assignedToId", e.target.value)}>
          <option value="">All assignees</option>
          {usersPage?.items.map((u) => (
            <option key={u.id} value={u.id}>
              {u.firstName} {u.lastName}
            </option>
          ))}
        </Select>
        <Input
          type="date"
          aria-label="Created date"
          className="w-40"
          value={createdDate}
          onChange={(e) => updateParam("createdDate", e.target.value || "all")}
        />
        {!isAllDates && (
          <Button variant="secondary" onClick={() => updateParam("createdDate", "all")}>
            All dates
          </Button>
        )}
      </Card>

      {isLoading ? (
        <PageSpinner />
      ) : isError ? (
        <Card className="p-6">
          <ErrorState onRetry={() => refetch()} />
        </Card>
      ) : (
        <>
          <Table>
            <Thead>
              <Tr>
                <Th>Title</Th>
                <Th>Status</Th>
                <Th>Priority</Th>
                <Th>Assigned to</Th>
                <Th>Due</Th>
                <Th>Created</Th>
                <Th />
              </Tr>
            </Thead>
            <Tbody>
              {data?.items.map((task) => (
                <Tr key={task.id}>
                  <Td>
                    <Link
                      to={`/tasks/${task.id}`}
                      className="font-medium text-brand-600 hover:underline dark:text-brand-500"
                    >
                      {task.title}
                    </Link>
                  </Td>
                  <Td>
                    <TaskStatusCell taskId={task.id} assignedToId={task.assignedToId} status={task.status} />
                  </Td>
                  <Td>
                    <Badge variant={TASK_PRIORITY_VARIANT[task.priority]}>{task.priority}</Badge>
                  </Td>
                  <Td>
                    {task.assignedToId ? (
                      <Link to={`/tasks?assignedToId=${task.assignedToId}`} className="hover:underline">
                        {task.assignedToName}
                      </Link>
                    ) : (
                      "Unassigned"
                    )}
                  </Td>
                  <Td>
                    {isRolledToToday(task) ? (
                      <span className="inline-flex items-center gap-1.5">
                        {new Date().toLocaleDateString()}
                        <Badge variant="warning">Today</Badge>
                      </span>
                    ) : task.dueAt ? (
                      new Date(task.dueAt).toLocaleString()
                    ) : (
                      "—"
                    )}
                  </Td>
                  <Td>{new Date(task.createdAt).toLocaleString()}</Td>
                  <Td>
                    {canDelete && (
                      <Button variant="ghost" size="sm" onClick={() => setPendingDeleteId(task.id)}>
                        Delete
                      </Button>
                    )}
                  </Td>
                </Tr>
              ))}
              {data?.items.length === 0 && (
                <Tr>
                  <Td colSpan={7}>
                    <EmptyState
                      icon={ListTodo}
                      title="No tasks found"
                      description="Try adjusting your filters, or create a new task."
                      action={
                        canCreate && (
                          <Link to="/tasks/new">
                            <Button size="sm">
                              <Plus size={16} /> New Task
                            </Button>
                          </Link>
                        )
                      }
                    />
                  </Td>
                </Tr>
              )}
            </Tbody>
          </Table>

          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
              <span>
                Page {data.page} of {data.totalPages} ({data.total} tasks)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => updateParam("page", String(page - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= data.totalPages}
                  onClick={() => updateParam("page", String(page + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={Boolean(pendingDeleteId)}
        title="Delete task"
        description={`Are you sure you want to delete "${pendingTask?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        isLoading={deleteTask.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
}
