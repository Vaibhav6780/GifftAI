import { useSearchParams } from "react-router-dom";
import { HandCoins } from "lucide-react";
import type { RmManualRequestStatus } from "@gifftai/shared";
import { useRmManualRequests, useRmRequestsStatus, useSetRmManualRequestStatus } from "../../features/rm-requests/api";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import { PageSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { Table, Tbody, Td, Th, Thead, Tr } from "../../components/ui/Table";
import { toast } from "../../components/ui/Toast";
import { useHasPermission } from "../../hooks/usePermission";

const FILTERS: (RmManualRequestStatus | "all")[] = ["all", "new", "contacted", "done", "cancelled"];

const STATUS_VARIANT: Record<RmManualRequestStatus, "warning" | "info" | "success" | "neutral"> = {
  new: "warning",
  contacted: "info",
  done: "success",
  cancelled: "neutral",
};

const NEXT_ACTIONS: Record<RmManualRequestStatus, { label: string; to: RmManualRequestStatus }[]> = {
  new: [
    { label: "Mark contacted", to: "contacted" },
    { label: "Mark done", to: "done" },
    { label: "Cancel", to: "cancelled" },
  ],
  contacted: [
    { label: "Mark done", to: "done" },
    { label: "Cancel", to: "cancelled" },
  ],
  done: [{ label: "Reopen", to: "new" }],
  cancelled: [{ label: "Reopen", to: "new" }],
};

function fmt(amount: number) {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function RmManualRequestsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const canManage = useHasPermission("rm_requests:manage");
  const status = (searchParams.get("status") as RmManualRequestStatus | "all" | null) ?? "all";

  const { data: connection } = useRmRequestsStatus();
  const connected = connection?.connected ?? true;

  const { data: rows, isLoading, isError, refetch } = useRmManualRequests({
    status: status === "all" ? undefined : status,
  });
  const setStatusMutation = useSetRmManualRequestStatus();

  function setFilter(next: string) {
    const params = new URLSearchParams(searchParams);
    params.set("status", next);
    setSearchParams(params);
  }

  function handleSetStatus(id: string, next: RmManualRequestStatus) {
    setStatusMutation.mutate(
      { id, status: next },
      {
        onSuccess: () => toast.success("Status updated"),
        onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to update"),
      },
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">RM Manual Requests</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Trader "Request to RM" deposit/withdraw forms from gifftai.com — they also email the RM; this is the tracked copy.
        </p>
      </div>

      {!connected ? (
        <Card className="p-6">
          <EmptyState
            icon={HandCoins}
            title="RM Requests isn't connected"
            description="Set WEBSITE_ADMIN_API_URL and WEBSITE_ADMIN_SERVICE_KEY on the CRM API to see live requests from gifftai.com."
          />
        </Card>
      ) : (
        <>
          <Card className="flex flex-wrap gap-2 p-4">
            {FILTERS.map((f) => (
              <Button
                key={f}
                size="sm"
                variant={status === f ? "primary" : "secondary"}
                className="capitalize"
                onClick={() => setFilter(f)}
              >
                {f}
              </Button>
            ))}
          </Card>

          {isLoading ? (
            <PageSpinner />
          ) : isError ? (
            <Card className="p-6">
              <ErrorState onRetry={() => refetch()} />
            </Card>
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>Date</Th>
                  <Th>User</Th>
                  <Th>Type</Th>
                  <Th>Amount</Th>
                  <Th>Method</Th>
                  <Th>Phone</Th>
                  <Th>Details / Note</Th>
                  <Th>Status</Th>
                  {canManage && <Th />}
                </Tr>
              </Thead>
              <Tbody>
                {rows?.map((r) => (
                  <Tr key={r.id}>
                    <Td className="whitespace-nowrap">{r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"}</Td>
                    <Td>
                      <div>{r.userName || "—"}</div>
                      {r.userEmail && <div className="text-xs text-slate-500 dark:text-slate-400">{r.userEmail}</div>}
                    </Td>
                    <Td className="capitalize">{r.side}</Td>
                    <Td className="font-mono">{fmt(r.amount)}</Td>
                    <Td>{r.method || "—"}</Td>
                    <Td className="whitespace-nowrap">{r.phone || "—"}</Td>
                    <Td className="max-w-56">
                      {r.payoutDetails && <div>{r.payoutDetails}</div>}
                      {r.note && <div className="text-xs text-slate-500 dark:text-slate-400">{r.note}</div>}
                      {!r.payoutDetails && !r.note && "—"}
                    </Td>
                    <Td>
                      <Badge variant={STATUS_VARIANT[r.status]} className="capitalize">
                        {r.status}
                      </Badge>
                    </Td>
                    {canManage && (
                      <Td>
                        <div className="flex flex-col items-end gap-1">
                          {NEXT_ACTIONS[r.status].map((a) => (
                            <Button
                              key={a.to}
                              size="sm"
                              variant="secondary"
                              disabled={setStatusMutation.isPending}
                              onClick={() => handleSetStatus(r.id, a.to)}
                            >
                              {a.label}
                            </Button>
                          ))}
                        </div>
                      </Td>
                    )}
                  </Tr>
                ))}
                {rows?.length === 0 && (
                  <Tr>
                    <Td colSpan={canManage ? 9 : 8}>
                      <EmptyState icon={HandCoins} title="No requests" description="No manual requests match this filter." />
                    </Td>
                  </Tr>
                )}
              </Tbody>
            </Table>
          )}
        </>
      )}
    </div>
  );
}
