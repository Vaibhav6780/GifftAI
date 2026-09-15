import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Banknote, Check, DollarSign, FileText, X } from "lucide-react";
import type { RmFundingRequestStatus } from "@gifftai/shared";
import {
  useApproveRmFundingRequest,
  useCreditRmFundingRequest,
  useRejectRmFundingRequest,
  useRmFundingRequests,
  useRmRequestsStatus,
  useViewRmFundingProof,
} from "../../features/rm-requests/api";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import { Modal } from "../../components/ui/Modal";
import { Textarea } from "../../components/ui/Textarea";
import { PageSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { Table, Tbody, Td, Th, Thead, Tr } from "../../components/ui/Table";
import { toast } from "../../components/ui/Toast";
import { useHasPermission } from "../../hooks/usePermission";

const FILTERS: (RmFundingRequestStatus | "all")[] = ["pending", "approved", "credited", "rejected", "all"];

const STATUS_VARIANT: Record<RmFundingRequestStatus, "warning" | "info" | "success" | "danger"> = {
  pending: "warning",
  approved: "info",
  credited: "success",
  rejected: "danger",
};

function fmt(amount: number, currency: string) {
  return `${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

export function RmFundingRequestsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const canManage = useHasPermission("rm_requests:manage");
  const status = (searchParams.get("status") as RmFundingRequestStatus | "all" | null) ?? "pending";

  const { data: connection } = useRmRequestsStatus();
  const connected = connection?.connected ?? true; // avoid a flash of "not connected" before the first response

  const { data: rows, isLoading, isError, refetch } = useRmFundingRequests({
    status: status === "all" ? undefined : status,
  });

  const approve = useApproveRmFundingRequest();
  const credit = useCreditRmFundingRequest();
  const reject = useRejectRmFundingRequest();
  const viewProof = useViewRmFundingProof();

  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  function setStatus(next: string) {
    const params = new URLSearchParams(searchParams);
    params.set("status", next);
    setSearchParams(params);
  }

  function handleApprove(id: string) {
    setBusyId(id);
    approve.mutate(id, {
      onSuccess: () => toast.success("Proof approved — a second admin must release funds"),
      onError: (error) => toast.error(error instanceof Error ? error.message : "Approve failed"),
      onSettled: () => setBusyId(null),
    });
  }

  function handleCredit(id: string) {
    setBusyId(id);
    credit.mutate(id, {
      onSuccess: () => toast.success("Funds released to the user"),
      onError: (error) => toast.error(error instanceof Error ? error.message : "Credit failed"),
      onSettled: () => setBusyId(null),
    });
  }

  function openReject(id: string) {
    setRejectTarget(id);
    setRejectReason("");
  }

  function submitReject() {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) {
      toast.error("A reason is required to reject");
      return;
    }
    setBusyId(rejectTarget);
    reject.mutate(
      { id: rejectTarget, reason: rejectReason.trim() },
      {
        onSuccess: () => {
          toast.success("Request rejected");
          setRejectTarget(null);
        },
        onError: (error) => toast.error(error instanceof Error ? error.message : "Reject failed"),
        onSettled: () => setBusyId(null),
      },
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">RM Funding Requests</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Two-admin flow from gifftai.com: approve the proof, then a different admin credits the user.
        </p>
      </div>

      {!connected ? (
        <Card className="p-6">
          <EmptyState
            icon={Banknote}
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
                onClick={() => setStatus(f)}
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
                  <Th>RM</Th>
                  <Th>Client</Th>
                  <Th>Amount</Th>
                  <Th>Method / Note</Th>
                  <Th>Proof</Th>
                  <Th>Status</Th>
                  {canManage && <Th />}
                </Tr>
              </Thead>
              <Tbody>
                {rows?.map((r) => (
                  <Tr key={r.id}>
                    <Td className="whitespace-nowrap">{r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"}</Td>
                    <Td>{r.rmName}</Td>
                    <Td>
                      <div>{r.userName}</div>
                      {r.userEmail && <div className="text-xs text-slate-500 dark:text-slate-400">{r.userEmail}</div>}
                    </Td>
                    <Td className="font-mono">{fmt(r.amount, r.currency)}</Td>
                    <Td>
                      <div className="capitalize">{r.method || "—"}</div>
                      {r.note && <div className="text-xs text-slate-500 dark:text-slate-400">{r.note}</div>}
                    </Td>
                    <Td>
                      {r.hasProof ? (
                        <button
                          type="button"
                          onClick={() => viewProof.mutate(r.id)}
                          className="inline-flex items-center gap-1 text-brand-600 hover:underline dark:text-brand-500"
                        >
                          <FileText size={14} /> View
                        </button>
                      ) : (
                        "—"
                      )}
                    </Td>
                    <Td>
                      <Badge variant={STATUS_VARIANT[r.status]} className="capitalize">
                        {r.status}
                      </Badge>
                      {r.approvedBy && (
                        <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Approved by {r.approvedBy}</div>
                      )}
                      {r.creditedBy && (
                        <div className="text-xs text-slate-500 dark:text-slate-400">Credited by {r.creditedBy}</div>
                      )}
                      {r.status === "rejected" && r.rejectionReason && (
                        <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{r.rejectionReason}</div>
                      )}
                    </Td>
                    {canManage && (
                      <Td>
                        <div className="flex justify-end gap-1.5">
                          {r.status === "pending" && (
                            <Button size="sm" variant="secondary" disabled={busyId === r.id} onClick={() => handleApprove(r.id)}>
                              <Check size={14} /> Approve
                            </Button>
                          )}
                          {r.status === "approved" && (
                            <Button size="sm" variant="secondary" disabled={busyId === r.id} onClick={() => handleCredit(r.id)}>
                              <DollarSign size={14} /> Credit
                            </Button>
                          )}
                          {(r.status === "pending" || r.status === "approved") && (
                            <Button size="sm" variant="danger" disabled={busyId === r.id} onClick={() => openReject(r.id)}>
                              <X size={14} /> Reject
                            </Button>
                          )}
                        </div>
                      </Td>
                    )}
                  </Tr>
                ))}
                {rows?.length === 0 && (
                  <Tr>
                    <Td colSpan={canManage ? 8 : 7}>
                      <EmptyState
                        icon={Banknote}
                        title="No requests"
                        description={`No ${status !== "all" ? status : ""} funding requests.`}
                      />
                    </Td>
                  </Tr>
                )}
              </Tbody>
            </Table>
          )}
        </>
      )}

      <Modal open={Boolean(rejectTarget)} onClose={() => setRejectTarget(null)} title="Reject funding request">
        <div className="flex flex-col gap-4">
          <Textarea
            label="Reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
            placeholder="Why is this request being rejected?"
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" isLoading={reject.isPending} onClick={submitReject}>
              Reject
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
