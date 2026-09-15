import { useSearchParams } from "react-router-dom";
import { Clock, Download } from "lucide-react";
import { formatOvertimeMinutes } from "@gifftai/shared";
import type { AttendanceLocation, AttendanceStatus } from "@gifftai/shared";
import { useAttendanceList, useExportAttendance } from "../../features/attendance/api";
import { useUsersList } from "../../features/users/api";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Badge } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import { PageSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { Table, Tbody, Td, Th, Thead, Tr } from "../../components/ui/Table";
import { toast } from "../../components/ui/Toast";

const STATUS_VARIANT: Record<AttendanceStatus, "success" | "neutral"> = {
  ONLINE: "success",
  OFFLINE: "neutral",
};

const LOCATION_VARIANT: Record<AttendanceLocation, "info" | "warning"> = {
  OFFICE: "info",
  REMOTE: "warning",
};

export function AttendancePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: usersPage } = useUsersList({ pageSize: 100, sortBy: "firstName", sortOrder: "asc" });

  const page = Number(searchParams.get("page") ?? "1");
  const userId = searchParams.get("userId") ?? "";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const hideSuperAdmin = searchParams.get("hideSuperAdmin") === "1";

  const { data, isLoading, isError, refetch } = useAttendanceList({
    page,
    pageSize: 20,
    userId: userId || undefined,
    from: from || undefined,
    to: to || undefined,
  });
  const exportAttendance = useExportAttendance();

  // AttendanceSessionSummary carries no role info of its own — cross-referenced against
  // the employee filter's own user list (already fetched, roles included) rather than
  // adding a role filter to the attendance API.
  const superAdminUserIds = new Set(
    (usersPage?.items ?? []).filter((u) => u.roles.some((r) => r.name === "Super Admin")).map((u) => u.id),
  );
  const visibleItems = (data?.items ?? []).filter((session) => !hideSuperAdmin || !superAdminUserIds.has(session.userId));

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.set("page", "1");
    setSearchParams(next);
  }

  function toggleHideSuperAdmin() {
    updateParam("hideSuperAdmin", hideSuperAdmin ? "" : "1");
  }

  function handleExport() {
    exportAttendance.mutate(
      {
        userId: userId || undefined,
        from: from || undefined,
        to: to || undefined,
        hideSuperAdmin: hideSuperAdmin || undefined,
      },
      {
        onSuccess: (blob) => {
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `attendance-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
          document.body.appendChild(link);
          link.click();
          link.remove();
          URL.revokeObjectURL(url);
        },
        onError: (error) => {
          toast.error(error instanceof Error ? error.message : "Failed to export attendance");
        },
      },
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Attendance</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Online/Offline history for every employee, with Office/Remote decided by their IP when they went
            online. Logging in after 10:30 AM IST counts as a half day; time worked after 6:30 PM IST counts
            as overtime.
          </p>
        </div>
        <Button variant="secondary" onClick={handleExport} isLoading={exportAttendance.isPending}>
          <Download size={16} /> Export
        </Button>
      </div>

      <Card className="flex flex-wrap gap-3 p-4">
        <Select className="w-56" value={userId} onChange={(e) => updateParam("userId", e.target.value)}>
          <option value="">All employees</option>
          {usersPage?.items.map((u) => (
            <option key={u.id} value={u.id}>
              {u.firstName} {u.lastName}
            </option>
          ))}
        </Select>
        <Input
          type="date"
          aria-label="From date"
          className="w-40"
          value={from}
          onChange={(e) => updateParam("from", e.target.value)}
        />
        <Input
          type="date"
          aria-label="To date"
          className="w-40"
          value={to}
          onChange={(e) => updateParam("to", e.target.value)}
        />
        <label className="flex items-center gap-2 self-center text-sm text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            className="size-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-600"
            checked={hideSuperAdmin}
            onChange={toggleHideSuperAdmin}
          />
          Hide Super Admin entries
        </label>
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
                <Th>Employee</Th>
                <Th>Date</Th>
                <Th>Online At</Th>
                <Th>Offline At</Th>
                <Th>IP</Th>
                <Th>Location</Th>
                <Th>Status</Th>
                <Th>Half Day</Th>
                <Th>Overtime</Th>
                <Th>Overtime Extended To</Th>
              </Tr>
            </Thead>
            <Tbody>
              {visibleItems.map((session) => (
                <Tr key={session.id}>
                  <Td className="font-medium text-slate-900 dark:text-slate-100">{session.userName}</Td>
                  <Td>{session.date}</Td>
                  <Td>{new Date(session.onlineAt).toLocaleTimeString()}</Td>
                  <Td>{session.offlineAt ? new Date(session.offlineAt).toLocaleTimeString() : "—"}</Td>
                  <Td className="font-mono text-xs">{session.ip ?? "—"}</Td>
                  <Td>
                    <Badge variant={LOCATION_VARIANT[session.location]}>{session.location}</Badge>
                  </Td>
                  <Td>
                    <Badge variant={STATUS_VARIANT[session.status]}>{session.status}</Badge>
                  </Td>
                  <Td>
                    <Badge variant={session.halfDay ? "warning" : "neutral"}>{session.halfDay ? "Yes" : "No"}</Badge>
                  </Td>
                  <Td>{formatOvertimeMinutes(session.overtimeMinutes)}</Td>
                  <Td>
                    {session.extendedExitTime ? new Date(session.extendedExitTime).toLocaleTimeString() : "—"}
                  </Td>
                </Tr>
              ))}
              {visibleItems.length === 0 && (
                <Tr>
                  <Td colSpan={10}>
                    <EmptyState
                      icon={Clock}
                      title="No attendance records"
                      description="Try adjusting the employee or date filters."
                    />
                  </Td>
                </Tr>
              )}
            </Tbody>
          </Table>

          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
              <span>
                Page {data.page} of {data.totalPages} ({data.total} sessions)
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
