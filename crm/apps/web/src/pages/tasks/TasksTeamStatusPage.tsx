import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Search, Users } from "lucide-react";
import type { UserStatus } from "@gifftai/shared";
import { useUsersList } from "../../features/users/api";
import { useDepartmentsList } from "../../features/departments/api";
import { UserTaskSummaryCell } from "../../features/users/components/UserTaskSummaryCell";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Badge } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import { PageSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { Table, Tbody, Td, Th, Thead, Tr } from "../../components/ui/Table";

const STATUS_VARIANT: Record<UserStatus, "success" | "warning" | "neutral"> = {
  ACTIVE: "success",
  SUSPENDED: "warning",
  INACTIVE: "neutral",
};

/** Every employee's current work status, in one place — same list/columns as the Users
 *  page, surfaced inside the Tasks section so an Admin/Super Admin doesn't have to leave
 *  Tasks to see who has what on their plate. */
export function TasksTeamStatusPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: departments } = useDepartmentsList();

  const page = Number(searchParams.get("page") ?? "1");
  const search = searchParams.get("search") ?? "";
  const status = (searchParams.get("status") ?? "") as UserStatus | "";
  const departmentId = searchParams.get("departmentId") ?? "";

  const { data, isLoading, isError, refetch } = useUsersList({
    page,
    pageSize: 20,
    search: search || undefined,
    status: status || undefined,
    departmentId: departmentId || undefined,
  });

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.set("page", "1");
    setSearchParams(next);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Team Task Status</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Every employee's account status and current task load, at a glance.
          </p>
        </div>
        <Link to="/tasks">
          <Button variant="secondary">
            <ArrowLeft size={16} /> Back to Tasks
          </Button>
        </Link>
      </div>

      <Card className="flex flex-wrap gap-3 p-4">
        <div className="relative flex-1 min-w-56">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <Input
            placeholder="Search by name or email"
            defaultValue={search}
            className="pl-9"
            onChange={(e) => updateParam("search", e.target.value)}
          />
        </div>
        <Select className="w-44" value={status} onChange={(e) => updateParam("status", e.target.value)}>
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="SUSPENDED">Suspended</option>
        </Select>
        <Select className="w-56" value={departmentId} onChange={(e) => updateParam("departmentId", e.target.value)}>
          <option value="">All departments</option>
          {departments?.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
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
                <Th>Name</Th>
                <Th>Phone</Th>
                <Th>Department</Th>
                <Th>Roles</Th>
                <Th>Status</Th>
                <Th>Tasks</Th>
                <Th>Last login</Th>
              </Tr>
            </Thead>
            <Tbody>
              {data?.items.map((user) => (
                <Tr key={user.id}>
                  <Td>
                    <Link to={`/users/${user.id}`} className="font-medium text-brand-600 hover:underline dark:text-brand-500">
                      {user.firstName} {user.lastName}
                    </Link>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{user.email}</div>
                  </Td>
                  <Td>{user.phone ?? "—"}</Td>
                  <Td>{user.departmentName ?? "—"}</Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((r) => (
                        <Badge key={r.id}>{r.name}</Badge>
                      ))}
                    </div>
                  </Td>
                  <Td>
                    <Badge variant={STATUS_VARIANT[user.status]}>{user.status}</Badge>
                  </Td>
                  <Td>
                    <UserTaskSummaryCell user={user} />
                  </Td>
                  <Td>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "Never"}</Td>
                </Tr>
              ))}
              {data?.items.length === 0 && (
                <Tr>
                  <Td colSpan={7}>
                    <EmptyState
                      icon={Users}
                      title="No users found"
                      description="Try adjusting your filters."
                    />
                  </Td>
                </Tr>
              )}
            </Tbody>
          </Table>

          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
              <span>
                Page {data.page} of {data.totalPages} ({data.total} users)
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
    </div>
  );
}
