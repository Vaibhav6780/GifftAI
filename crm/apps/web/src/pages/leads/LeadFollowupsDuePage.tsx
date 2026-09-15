import { Link, useSearchParams } from "react-router-dom";
import { AlarmClock } from "lucide-react";
import type { LeadBrand, LeadStatus } from "@gifftai/shared";
import { useLeadFollowups } from "../../features/leads/api";
import { LeadNoteCell } from "../../features/leads/components/LeadNoteCell";
import { LeadActivityModal } from "../../features/leads/components/LeadActivityModal";
import { FollowupCompleteCell } from "../../features/leads/components/FollowupCompleteCell";
import { LeadFollowupCell } from "../../features/leads/components/LeadFollowupCell";
import {
  BRAND_LABEL,
  BRAND_OPTIONS,
  BRAND_VARIANT,
  STATUS_LABEL,
  STATUS_OPTIONS,
  STATUS_ROW_TINT,
  STATUS_VARIANT,
} from "../../features/leads/constants";
import { useUsersList } from "../../features/users/api";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { PageSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { Table, Tbody, Td, Th, Thead, Tr } from "../../components/ui/Table";
import { useIsPrivileged } from "../../hooks/usePermission";

/** UTC calendar day, matching the gte/lte day-range the backend filters `followupDate` by. */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysOverdue(dueDate: string): number {
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((today.getTime() - due.getTime()) / 86_400_000);
}

function dueLabel(overdue: number): { text: string; className: string } {
  if (overdue > 0) {
    return { text: `${overdue} day${overdue === 1 ? "" : "s"} overdue`, className: "text-red-600 dark:text-red-500" };
  }
  if (overdue === 0) {
    return { text: "Due today", className: "text-amber-600 dark:text-amber-500" };
  }
  const inDays = -overdue;
  return { text: `In ${inDays} day${inDays === 1 ? "" : "s"}`, className: "text-slate-500 dark:text-slate-400" };
}

const COMPLETION_FILTERS: { value: "" | "no" | "yes"; label: string }[] = [
  { value: "no", label: "Incomplete" },
  { value: "yes", label: "Complete" },
  { value: "", label: "All" },
];

export function LeadFollowupsDuePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const isPrivileged = useIsPrivileged();
  const { data: usersPage } = useUsersList({ pageSize: 100, sortBy: "firstName", sortOrder: "asc" });

  const page = Number(searchParams.get("page") ?? "1");
  const ownerId = searchParams.get("ownerId") ?? "";
  const status = (searchParams.get("status") ?? "") as LeadStatus | "";
  const brand = (searchParams.get("brand") ?? "") as LeadBrand | "";
  // Absent param -> defaults to today; "all" is the explicit escape hatch to see every
  // due/overdue/upcoming follow-up at once (same UX as Tasks' createdDate filter).
  const followupDateParam = searchParams.get("followupDate");
  const isAllDates = followupDateParam === "all";
  const followupDate = isAllDates ? "" : (followupDateParam ?? todayIso());
  // Persistent, date-aware -- backed by the LeadFollowup history table, not client state.
  // Defaults to "Incomplete" (matches this page's only behavior before this filter existed).
  const completedParam = (searchParams.get("completed") ?? "no") as "" | "no" | "yes";

  const { data, isLoading, isError, refetch } = useLeadFollowups({
    page,
    pageSize: 20,
    ownerId: ownerId || undefined,
    status: status || undefined,
    brand: brand || undefined,
    followupDate: followupDate || undefined,
    completed: completedParam || undefined,
  });

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.set("page", "1");
    setSearchParams(next);
  }

  const rows = data?.items ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Follow-ups</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {isAllDates
            ? "Every lead flagged for follow-up, due/overdue and upcoming alike — soonest and most overdue first."
            : "Leads with a follow-up due today. Pick a date or hit \"All dates\" to see overdue and upcoming ones too."}
        </p>
      </div>

      <Card className="flex flex-wrap items-center gap-3 p-4">
        {isPrivileged && (
          <Select className="w-48" value={ownerId} onChange={(e) => updateParam("ownerId", e.target.value)}>
            <option value="">All owners</option>
            {usersPage?.items.map((u) => (
              <option key={u.id} value={u.id}>
                {u.firstName} {u.lastName}
              </option>
            ))}
          </Select>
        )}
        <Select className="w-44" value={status} onChange={(e) => updateParam("status", e.target.value)}>
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </Select>
        <Select className="w-40" value={brand} onChange={(e) => updateParam("brand", e.target.value)}>
          <option value="">All brands</option>
          {BRAND_OPTIONS.map((b) => (
            <option key={b} value={b}>
              {BRAND_LABEL[b]}
            </option>
          ))}
        </Select>
        <Input
          type="date"
          aria-label="Due date"
          className="w-40"
          value={followupDate}
          onChange={(e) => updateParam("followupDate", e.target.value || "all")}
        />
        {!isAllDates && (
          <Button variant="secondary" onClick={() => updateParam("followupDate", "all")}>
            All dates
          </Button>
        )}
        <div className="flex items-center gap-1.5">
          {COMPLETION_FILTERS.map((f) => (
            <Button
              key={f.value}
              size="sm"
              variant={completedParam === f.value ? "primary" : "secondary"}
              onClick={() => updateParam("completed", f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
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
                <Th>Company</Th>
                <Th>Status</Th>
                <Th>Owner</Th>
                <Th>Brand</Th>
                <Th>Due</Th>
                <Th>Next follow-up</Th>
                <Th>Note</Th>
                <Th>Report</Th>
                <Th>Complete</Th>
              </Tr>
            </Thead>
            <Tbody>
              {rows.map((lead) => {
                const isCompleted = Boolean(lead.completedAt);
                const label = dueLabel(daysOverdue(lead.dueDate));
                return (
                  <Tr key={lead.followupId} className={isCompleted ? "opacity-60" : STATUS_ROW_TINT[lead.status]}>
                    <Td>
                      <Link to={`/leads/${lead.id}`} className="font-medium text-brand-600 hover:underline dark:text-brand-500">
                        {lead.firstName} {lead.lastName}
                      </Link>
                      {lead.email && <div className="text-xs text-slate-500 dark:text-slate-400">{lead.email}</div>}
                    </Td>
                    <Td>{lead.phone ?? "—"}</Td>
                    <Td>{lead.company ?? "—"}</Td>
                    <Td>
                      <Badge variant={STATUS_VARIANT[lead.status]}>{STATUS_LABEL[lead.status]}</Badge>
                    </Td>
                    <Td>{lead.ownerName ?? <span className="text-slate-400 dark:text-slate-500">Unassigned</span>}</Td>
                    <Td>
                      <Badge variant={BRAND_VARIANT[lead.brand]}>{BRAND_LABEL[lead.brand]}</Badge>
                    </Td>
                    <Td>
                      <div className="flex flex-col">
                        <span>
                          {new Date(lead.dueDate).toLocaleDateString()}
                          {lead.dueTime && <span className="text-slate-500 dark:text-slate-400"> at {lead.dueTime}</span>}
                        </span>
                        <span className={`text-xs font-medium ${label.className}`}>{label.text}</span>
                      </div>
                    </Td>
                    <Td>
                      <LeadFollowupCell
                        leadId={lead.id}
                        ownerId={lead.ownerId}
                        needsFollowup={lead.needsFollowup}
                        followupDate={lead.followupDate}
                        followupTime={lead.followupTime}
                      />
                    </Td>
                    <Td>
                      <LeadNoteCell leadId={lead.id} ownerId={lead.ownerId} />
                    </Td>
                    <Td>
                      <LeadActivityModal leadId={lead.id} leadLabel={`${lead.firstName} ${lead.lastName}`} />
                    </Td>
                    <Td>
                      <FollowupCompleteCell
                        leadId={lead.id}
                        ownerId={lead.ownerId}
                        dueDate={lead.dueDate}
                        dueTime={lead.dueTime}
                        completedAt={lead.completedAt}
                      />
                    </Td>
                  </Tr>
                );
              })}
              {rows.length === 0 && (
                <Tr>
                  <Td colSpan={11}>
                    <EmptyState
                      icon={AlarmClock}
                      title="No follow-ups"
                      description={
                        isAllDates && !status
                          ? "No leads are flagged for follow-up yet — they'll show up here as soon as one is scheduled."
                          : !isAllDates && !status && followupDate === todayIso()
                            ? "No follow-ups due today."
                            : "No follow-ups match these filters."
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
                Page {data.page} of {data.totalPages} ({data.total} due)
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
