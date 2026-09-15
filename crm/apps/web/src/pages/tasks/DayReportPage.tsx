import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { NotebookPen } from "lucide-react";
import { submitDailyReportSchema, type SubmitDailyReportInput } from "@gifftai/shared";
import { useMyDailyReports, useSubmitDailyReport } from "../../features/dailyReports/api";
import { Card } from "../../components/ui/Card";
import { Textarea } from "../../components/ui/Textarea";
import { Button } from "../../components/ui/Button";
import { toast } from "../../components/ui/Toast";
import { PageSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { Table, Tbody, Td, Th, Thead, Tr } from "../../components/ui/Table";

/** Local-date match for "today", same convention as MyAttendanceRequestsPage — only used
 *  here to find today's report client-side for the pre-fill; the API is still the
 *  authoritative source for which row "today" resolves to. */
function todayDateOnly(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function DayReportPage() {
  const { data, isLoading, isError, refetch } = useMyDailyReports({ pageSize: 30 });
  const submitReport = useSubmitDailyReport();

  const todayReport = data?.items.find((r) => r.date === todayDateOnly());
  const pastReports = data?.items.filter((r) => r.date !== todayDateOnly()) ?? [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SubmitDailyReportInput>({
    resolver: zodResolver(submitDailyReportSchema),
    defaultValues: { summary: "" },
  });

  // Pre-fill with today's already-submitted report once it loads, so re-opening this page
  // later in the day shows what you wrote rather than a blank box.
  useEffect(() => {
    if (todayReport) reset({ summary: todayReport.summary });
  }, [todayReport, reset]);

  const onSubmit = handleSubmit((values) => {
    submitReport.mutate(values, {
      onSuccess: () => toast.success(todayReport ? "Day Report updated" : "Day Report submitted"),
      onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to submit Day Report"),
    });
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Day Report</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Summarize what you worked on today. You can revise it any time before the day ends.
        </p>
      </div>

      <Card className="max-w-xl p-6">
        <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
          <Textarea
            label="What did you work on today?"
            rows={6}
            error={errors.summary?.message}
            {...register("summary")}
          />
          <div className="flex justify-end">
            <Button type="submit" isLoading={submitReport.isPending}>
              {todayReport ? "Update report" : "Submit report"}
            </Button>
          </div>
        </form>
      </Card>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-100">Your report history</h2>
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
                <Th>Summary</Th>
                <Th>Last updated</Th>
              </Tr>
            </Thead>
            <Tbody>
              {pastReports.map((report) => (
                <Tr key={report.id}>
                  <Td>{report.date}</Td>
                  <Td className="max-w-xl whitespace-pre-wrap">{report.summary}</Td>
                  <Td>{new Date(report.updatedAt).toLocaleString()}</Td>
                </Tr>
              ))}
              {pastReports.length === 0 && (
                <Tr>
                  <Td colSpan={3}>
                    <EmptyState
                      icon={NotebookPen}
                      title="No past reports yet"
                      description="Reports from previous days will show up here."
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
