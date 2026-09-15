import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ScrollText } from "lucide-react";
import type { AuditLogEntry } from "@gifftai/shared";
import { useAuditLogList, useAuditEntityTypes } from "../../features/audit/api";
import { useUsersList } from "../../features/users/api";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Badge } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import { Modal } from "../../components/ui/Modal";
import { PageSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { Table, Tbody, Td, Th, Thead, Tr } from "../../components/ui/Table";

function ValueDiffModal({ entry, onClose }: { entry: AuditLogEntry | null; onClose: () => void }) {
  return (
    <Modal open={entry !== null} onClose={onClose} title={entry ? `${entry.action} — ${entry.entityType}` : undefined} className="max-w-2xl">
      {entry && (
        <div className="flex flex-col gap-4 text-sm">
          <div className="grid grid-cols-2 gap-4 text-slate-600 dark:text-slate-300">
            <div>
              <span className="font-medium text-slate-900 dark:text-slate-100">Actor:</span>{" "}
              {entry.userName ?? "System"}
            </div>
            <div>
              <span className="font-medium text-slate-900 dark:text-slate-100">When:</span>{" "}
              {new Date(entry.createdAt).toLocaleString()}
            </div>
            <div>
              <span className="font-medium text-slate-900 dark:text-slate-100">Entity:</span>{" "}
              {entry.entityType} <span className="font-mono text-xs">{entry.entityId}</span>
            </div>
            <div>
              <span className="font-medium text-slate-900 dark:text-slate-100">IP:</span>{" "}
              {entry.ipAddress ?? "—"}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <div className="mb-1 font-medium text-slate-900 dark:text-slate-100">Old value</div>
              <pre className="max-h-64 overflow-auto rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-800">
                {entry.oldValue == null ? "—" : JSON.stringify(entry.oldValue, null, 2)}
              </pre>
            </div>
            <div>
              <div className="mb-1 font-medium text-slate-900 dark:text-slate-100">New value</div>
              <pre className="max-h-64 overflow-auto rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-800">
                {entry.newValue == null ? "—" : JSON.stringify(entry.newValue, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

export function AuditLogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selected, setSelected] = useState<AuditLogEntry | null>(null);
  const { data: usersPage } = useUsersList({ pageSize: 100, sortBy: "firstName", sortOrder: "asc" });
  const { data: entityTypes } = useAuditEntityTypes();

  const page = Number(searchParams.get("page") ?? "1");
  const userId = searchParams.get("userId") ?? "";
  const entityType = searchParams.get("entityType") ?? "";
  const action = searchParams.get("action") ?? "";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  const { data, isLoading, isError, refetch } = useAuditLogList({
    page,
    pageSize: 20,
    userId: userId || undefined,
    entityType: entityType || undefined,
    action: action || undefined,
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
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Audit Log</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Every create/update/delete/login action recorded across the CRM, newest first. Click a row for the
          full old/new value diff.
        </p>
      </div>

      <Card className="flex flex-wrap gap-3 p-4">
        <Select className="w-56" value={userId} onChange={(e) => updateParam("userId", e.target.value)}>
          <option value="">All users</option>
          {usersPage?.items.map((u) => (
            <option key={u.id} value={u.id}>
              {u.firstName} {u.lastName}
            </option>
          ))}
        </Select>
        <Select className="w-48" value={entityType} onChange={(e) => updateParam("entityType", e.target.value)}>
          <option value="">All entities</option>
          {entityTypes?.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </Select>
        <Input
          placeholder="Search action (e.g. lead.update)"
          className="w-56"
          value={action}
          onChange={(e) => updateParam("action", e.target.value)}
        />
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
                <Th>When</Th>
                <Th>Actor</Th>
                <Th>Action</Th>
                <Th>Entity</Th>
                <Th>IP</Th>
              </Tr>
            </Thead>
            <Tbody>
              {data?.items.map((entry) => (
                <Tr
                  key={entry.id}
                  className="cursor-pointer"
                  onClick={() => setSelected(entry)}
                >
                  <Td>{new Date(entry.createdAt).toLocaleString()}</Td>
                  <Td className="font-medium text-slate-900 dark:text-slate-100">
                    {entry.userName ?? "System"}
                  </Td>
                  <Td>
                    <Badge variant="neutral">{entry.action}</Badge>
                  </Td>
                  <Td>
                    {entry.entityType} <span className="font-mono text-xs text-slate-400">{entry.entityId}</span>
                  </Td>
                  <Td className="font-mono text-xs">{entry.ipAddress ?? "—"}</Td>
                </Tr>
              ))}
              {data?.items.length === 0 && (
                <Tr>
                  <Td colSpan={5}>
                    <EmptyState
                      icon={ScrollText}
                      title="No audit log entries"
                      description="Try adjusting the filters above."
                    />
                  </Td>
                </Tr>
              )}
            </Tbody>
          </Table>

          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
              <span>
                Page {data.page} of {data.totalPages} ({data.total} entries)
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

      <ValueDiffModal entry={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
