import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { LifeBuoy, Plus, Search } from "lucide-react";
import type { TicketPriority, TicketStatus } from "@gifftai/shared";
import { useDeleteTicket, useTicketsList } from "../../features/tickets/api";
import { PRIORITY_OPTIONS, PRIORITY_VARIANT, STATUS_OPTIONS, STATUS_VARIANT } from "../../features/tickets/constants";
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
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { toast } from "../../components/ui/Toast";
import { useHasPermission } from "../../hooks/usePermission";

export function TicketsListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const canCreate = useHasPermission("tickets:create");
  const canDelete = useHasPermission("tickets:delete");
  const { data: usersPage } = useUsersList({ pageSize: 100, sortBy: "firstName", sortOrder: "asc" });
  const deleteTicket = useDeleteTicket();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const page = Number(searchParams.get("page") ?? "1");
  const search = searchParams.get("search") ?? "";
  const status = (searchParams.get("status") ?? "") as TicketStatus | "";
  const priority = (searchParams.get("priority") ?? "") as TicketPriority | "";
  const assignedToId = searchParams.get("assignedToId") ?? "";

  const { data, isLoading, isError, refetch } = useTicketsList({
    page,
    pageSize: 20,
    search: search || undefined,
    status: status || undefined,
    priority: priority || undefined,
    assignedToId: assignedToId || undefined,
  });

  const pendingTicket = data?.items.find((t) => t.id === pendingDeleteId);

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.set("page", "1");
    setSearchParams(next);
  }

  function handleConfirmDelete() {
    if (!pendingDeleteId) return;
    deleteTicket.mutate(pendingDeleteId, {
      onSuccess: () => {
        toast.success("Ticket deleted");
        setPendingDeleteId(null);
      },
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : "Failed to delete ticket");
        setPendingDeleteId(null);
      },
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Tickets</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Support tickets raised by customers.</p>
        </div>
        {canCreate && (
          <Link to="/tickets/new">
            <Button>
              <Plus size={16} /> New Ticket
            </Button>
          </Link>
        )}
      </div>

      <Card className="flex flex-wrap gap-3 p-4">
        <div className="relative flex-1 min-w-56">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <Input
            placeholder="Search by subject or requester email"
            defaultValue={search}
            className="pl-9"
            onChange={(e) => updateParam("search", e.target.value)}
          />
        </div>
        <Select className="w-40" value={status} onChange={(e) => updateParam("status", e.target.value)}>
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <Select className="w-40" value={priority} onChange={(e) => updateParam("priority", e.target.value)}>
          <option value="">All priorities</option>
          {PRIORITY_OPTIONS.map((p) => (
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
                <Th>Subject</Th>
                <Th>Status</Th>
                <Th>Priority</Th>
                <Th>Assigned to</Th>
                <Th>Created</Th>
                <Th />
              </Tr>
            </Thead>
            <Tbody>
              {data?.items.map((ticket) => (
                <Tr key={ticket.id}>
                  <Td>
                    <Link
                      to={`/tickets/${ticket.id}`}
                      className="font-medium text-brand-600 hover:underline dark:text-brand-500"
                    >
                      {ticket.subject}
                    </Link>
                  </Td>
                  <Td>
                    <Badge variant={STATUS_VARIANT[ticket.status]}>{ticket.status}</Badge>
                  </Td>
                  <Td>
                    <Badge variant={PRIORITY_VARIANT[ticket.priority]}>{ticket.priority}</Badge>
                  </Td>
                  <Td>
                    {ticket.assignedToId ? (
                      <Link to={`/tickets?assignedToId=${ticket.assignedToId}`} className="hover:underline">
                        {ticket.assignedToName}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </Td>
                  <Td>{new Date(ticket.createdAt).toLocaleDateString()}</Td>
                  <Td>
                    {canDelete && (
                      <Button variant="ghost" size="sm" onClick={() => setPendingDeleteId(ticket.id)}>
                        Delete
                      </Button>
                    )}
                  </Td>
                </Tr>
              ))}
              {data?.items.length === 0 && (
                <Tr>
                  <Td colSpan={6}>
                    <EmptyState
                      icon={LifeBuoy}
                      title="No tickets found"
                      description="Try adjusting your filters, or add a new ticket."
                      action={
                        canCreate && (
                          <Link to="/tickets/new">
                            <Button size="sm">
                              <Plus size={16} /> New Ticket
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
                Page {data.page} of {data.totalPages} ({data.total} tickets)
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
        title="Delete ticket"
        description={`Are you sure you want to delete "${pendingTicket?.subject}"? This cannot be undone.`}
        confirmLabel="Delete"
        isLoading={deleteTicket.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
}
