import { useSearchParams } from "react-router-dom";
import { NotebookPen } from "lucide-react";
import { useAllDailyReports } from "../../features/dailyReports/api";
import { useUsersList } from "../../features/users/api";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Card } from "../../components/ui/Card";
import { PageSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { Table, Tbody, Td, Th, Thead, Tr } from "../../components/ui/Table";

export function TeamDayReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: usersPage } = useUsersList({ pageSize: 100, sortBy: "firstName", sortOrder: "asc" });

  const page = Number(searchParams.get("page") ?? "1");
  const userId = searchParams.get("userId") ?? "";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  const { data, isLoading, isError, refetch } = useAllDailyReports({
    page,
    pageSize: 20,
    userId: userId || undefined,
    from: from || undefined,
    to: to || undefined,
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
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Team Day Reports</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Every employee's daily work summaries.</p>
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
                <Th>Summary</Th>
                <Th>Last updated</Th>
              </Tr>
            </Thead>
            <Tbody>
              {data?.items.map((report) => (
                <Tr key={report.id}>
                  <Td className="font-medium text-slate-900 dark:text-slate-100">{report.userName}</Td>
                  <Td>{report.date}</Td>
                  <Td className="max-w-xl whitespace-pre-wrap">{report.summary}</Td>
                  <Td>{new Date(report.updatedAt).toLocaleString()}</Td>
                </Tr>
              ))}
              {data?.items.length === 0 && (
                <Tr>
                  <Td colSpan={4}>
                    <EmptyState
                      icon={NotebookPen}
                      title="No Day Reports found"
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
                Page {data.page} of {data.totalPages} ({data.total} reports)
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
