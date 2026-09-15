import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CalendarClock, Download } from "lucide-react";
import clsx from "clsx";
import type { AttendanceRequestStatus, AttendanceRequestSummary, AttendanceRequestType } from "@gifftai/shared";
import {
  useAttendanceRequestsList,
  useExportAttendanceRequests,
  useReviewAttendanceRequest,
} from "../../features/attendanceRequests/api";
import { useUsersList } from "../../features/users/api";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Textarea } from "../../components/ui/Textarea";
import { Badge } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import { Modal } from "../../components/ui/Modal";
import { PageSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { Table, Tbody, Td, Th, Thead, Tr } from "../../components/ui/Table";
import { toast } from "../../components/ui/Toast";

// "ALL" is a distinct sentinel, not "" — updateParam deletes empty-string params from the
// URL, which would make an explicit "show everything" choice indistinguishable from "no
// status param yet" (which defaults to PENDING below) and snap straight back to Pending.
const ALL_STATUSES = "ALL" as const;
const VIEW_TABS: { value: AttendanceRequestStatus | typeof ALL_STATUSES; label: string }[] = [
  { value: "PENDING", label: "Pending" },
  { value: ALL_STATUSES, label: "History (all)" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
];

const TYPE_LABEL: Record<AttendanceRequestType, string> = {
  WORK_FROM_HOME: "Work From Home",
  LEAVE: "Leave",
};

const STATUS_VARIANT: Record<AttendanceRequestStatus, "warning" | "success" | "danger"> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
};

function RejectModal({
  request,
  onClose,
}: {
  request: AttendanceRequestSummary;
  onClose: () => void;
}) {
  const [reviewNote, setReviewNote] = useState("");
  const review = useReviewAttendanceRequest();

  function handleReject() {
    review.mutate(
      { id: request.id, input: { status: "REJECTED", reviewNote: reviewNote || undefined } },
      {
        onSuccess: () => {
          toast.success("Request rejected");
          onClose();
        },
        onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to reject request"),
      },
    );
  }

  return (
    <Modal open onClose={onClose} title={`Reject ${TYPE_LABEL[request.type]} request`}>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        {request.userName} — {request.date}
      </p>
      <Textarea
        className="mt-4"
        label="Reason (optional)"
        rows={3}
        value={reviewNote}
        onChange={(e) => setReviewNote(e.target.value)}
      />
      <div className="mt-6 flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onClose} disabled={review.isPending}>
          Cancel
        </Button>
        <Button type="button" variant="danger" onClick={handleReject} isLoading={review.isPending}>
          Reject
        </Button>
      </div>
    </Modal>
  );
}

export function AttendanceRequestApprovalsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: usersPage } = useUsersList({ pageSize: 100, sortBy: "firstName", sortOrder: "asc" });
  const review = useReviewAttendanceRequest();
  const exportRequests = useExportAttendanceRequests();
  const [rejectTarget, setRejectTarget] = useState<AttendanceRequestSummary | null>(null);

  const page = Number(searchParams.get("page") ?? "1");
  const userId = searchParams.get("userId") ?? "";
  const status = (searchParams.get("status") ?? "PENDING") as AttendanceRequestStatus | typeof ALL_STATUSES;
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  const { data, isLoading, isError, refetch } = useAttendanceRequestsList({
    page,
    pageSize: 20,
    userId: userId || undefined,
    status: status === ALL_STATUSES ? undefined : status,
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

  function handleApprove(request: AttendanceRequestSummary) {
    review.mutate(
      { id: request.id, input: { status: "APPROVED" } },
      {
        onSuccess: () => toast.success("Request approved"),
        onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to approve request"),
      },
    );
  }

  function handleExport() {
    exportRequests.mutate(
      {
        userId: userId || undefined,
        status: status === ALL_STATUSES ? undefined : status,
        from: from || undefined,
        to: to || undefined,
      },
      {
        onSuccess: (blob) => {
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `wfh-leave-requests-${new Date().toISOString().slice(0, 10)}.xlsx`;
          document.body.appendChild(link);
          link.click();
          link.remove();
          URL.revokeObjectURL(url);
        },
        onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to export requests"),
      },
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">WFH/Leave Approvals</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Review employee Work From Home and Leave requests.
          </p>
        </div>
        <Button variant="secondary" onClick={handleExport} isLoading={exportRequests.isPending}>
          <Download size={16} /> Export
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {VIEW_TABS.map((tab) => (
          <button
            key={tab.label}
            type="button"
            onClick={() => updateParam("status", tab.value)}
            className={clsx(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              status === tab.value
                ? "bg-brand-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Card className="flex flex-wrap items-end gap-3 p-4">
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
          className="w-40"
          label="From"
          value={from}
          max={to || undefined}
          onChange={(e) => updateParam("from", e.target.value)}
        />
        <Input
          type="date"
          className="w-40"
          label="To"
          value={to}
          min={from || undefined}
          onChange={(e) => updateParam("to", e.target.value)}
        />
        {(from || to) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const next = new URLSearchParams(searchParams);
              next.delete("from");
              next.delete("to");
              next.set("page", "1");
              setSearchParams(next);
            }}
          >
            Clear dates
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
                <Th>Employee</Th>
                <Th>Date</Th>
                <Th>Type</Th>
                <Th>Reason</Th>
                <Th>Status</Th>
                <Th>Reviewed By</Th>
                <Th>Reviewed At</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {data?.items.map((request) => (
                <Tr key={request.id}>
                  <Td className="font-medium text-slate-900 dark:text-slate-100">{request.userName}</Td>
                  <Td>{request.date}</Td>
                  <Td>{TYPE_LABEL[request.type]}</Td>
                  <Td>{request.reason ?? "—"}</Td>
                  <Td>
                    <Badge variant={STATUS_VARIANT[request.status]}>{request.status}</Badge>
                  </Td>
                  <Td>{request.reviewedByName ?? "—"}</Td>
                  <Td>{request.reviewedAt ? new Date(request.reviewedAt).toLocaleString() : "—"}</Td>
                  <Td>
                    {request.status === "PENDING" ? (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleApprove(request)}
                          isLoading={review.isPending}
                        >
                          Approve
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => setRejectTarget(request)}>
                          Reject
                        </Button>
                      </div>
                    ) : (
                      "—"
                    )}
                  </Td>
                </Tr>
              ))}
              {data?.items.length === 0 && (
                <Tr>
                  <Td colSpan={8}>
                    <EmptyState
                      icon={CalendarClock}
                      title="No WFH/Leave requests"
                      description="Try adjusting the employee or status filters."
                    />
                  </Td>
                </Tr>
              )}
            </Tbody>
          </Table>

          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
              <span>
                Page {data.page} of {data.totalPages} ({data.total} requests)
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

      {rejectTarget && <RejectModal request={rejectTarget} onClose={() => setRejectTarget(null)} />}
    </div>
  );
}
