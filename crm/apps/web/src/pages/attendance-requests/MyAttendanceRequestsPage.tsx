import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarClock } from "lucide-react";
import {
  createAttendanceRequestSchema,
  isBeforeAttendanceRequestCutoff,
  type AttendanceRequestStatus,
  type AttendanceRequestType,
  type CreateAttendanceRequestInput,
} from "@gifftai/shared";
import { useCreateAttendanceRequest, useMyAttendanceRequests } from "../../features/attendanceRequests/api";
import { Card } from "../../components/ui/Card";
import { Select } from "../../components/ui/Select";
import { Textarea } from "../../components/ui/Textarea";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { toast } from "../../components/ui/Toast";
import { PageSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { Table, Tbody, Td, Th, Thead, Tr } from "../../components/ui/Table";

const TYPE_LABEL: Record<AttendanceRequestType, string> = {
  WORK_FROM_HOME: "Work From Home",
  LEAVE: "Leave",
};

const STATUS_VARIANT: Record<AttendanceRequestStatus, "warning" | "success" | "danger"> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
};

/** Local-date match for "today", mirroring the API's todayDateOnly() — only used here for
 *  early UX feedback (has today's request already been submitted?); the API is still the
 *  authoritative source for the cutoff/one-per-day rule. */
function todayDateOnly(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function MyAttendanceRequestsPage() {
  const { data, isLoading, isError, refetch } = useMyAttendanceRequests({ pageSize: 30 });
  const createRequest = useCreateAttendanceRequest();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateAttendanceRequestInput>({
    resolver: zodResolver(createAttendanceRequestSchema),
    defaultValues: { type: "WORK_FROM_HOME" },
  });

  const todayRequest = data?.items.find((r) => r.date === todayDateOnly());
  const cutoffPassed = !isBeforeAttendanceRequestCutoff();

  const onSubmit = handleSubmit((values) => {
    createRequest.mutate(values, {
      onSuccess: () => {
        toast.success("Request submitted");
        reset({ type: "WORK_FROM_HOME", reason: "" });
      },
      onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to submit request"),
    });
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">WFH/Leave Requests</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Submit a Work From Home or Leave request for today, before 9:45 AM. One request per day.
        </p>
      </div>

      <Card className="max-w-xl p-6">
        {todayRequest ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              You've already submitted a <span className="font-medium">{TYPE_LABEL[todayRequest.type]}</span>{" "}
              request for today.
            </p>
            <div>
              <Badge variant={STATUS_VARIANT[todayRequest.status]}>{todayRequest.status}</Badge>
            </div>
            {todayRequest.reviewNote && (
              <p className="text-sm text-slate-500 dark:text-slate-400">Note: {todayRequest.reviewNote}</p>
            )}
          </div>
        ) : cutoffPassed ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Today's 9:45 AM cutoff has passed — you can submit a new request tomorrow.
          </p>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
            <Select label="Request type" error={errors.type?.message} {...register("type")}>
              <option value="WORK_FROM_HOME">Work From Home</option>
              <option value="LEAVE">Leave</option>
            </Select>
            <Textarea
              label="Reason (optional)"
              rows={3}
              error={errors.reason?.message}
              {...register("reason", { setValueAs: (v) => v || undefined })}
            />
            <div className="flex justify-end">
              <Button type="submit" isLoading={createRequest.isPending}>
                Submit request
              </Button>
            </div>
          </form>
        )}
      </Card>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-100">Your request history</h2>
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
                <Th>Type</Th>
                <Th>Reason</Th>
                <Th>Status</Th>
                <Th>Reviewed By</Th>
                <Th>Review Note</Th>
              </Tr>
            </Thead>
            <Tbody>
              {data?.items.map((request) => (
                <Tr key={request.id}>
                  <Td>{request.date}</Td>
                  <Td>{TYPE_LABEL[request.type]}</Td>
                  <Td>{request.reason ?? "—"}</Td>
                  <Td>
                    <Badge variant={STATUS_VARIANT[request.status]}>{request.status}</Badge>
                  </Td>
                  <Td>{request.reviewedByName ?? "—"}</Td>
                  <Td>{request.reviewNote ?? "—"}</Td>
                </Tr>
              ))}
              {data?.items.length === 0 && (
                <Tr>
                  <Td colSpan={6}>
                    <EmptyState
                      icon={CalendarClock}
                      title="No requests yet"
                      description="Submit your first Work From Home or Leave request above."
                    />
                  </Td>
                </Tr>
              )}
            </Tbody>
          </Table>
        )}
      </div>
    </div>
  );
}
