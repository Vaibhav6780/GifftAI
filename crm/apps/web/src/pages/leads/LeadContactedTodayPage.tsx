import { Link, useSearchParams } from "react-router-dom";
import { CalendarClock, Check, Search } from "lucide-react";
import clsx from "clsx";
import type { LeadBrand, LeadStatus } from "@gifftai/shared";
import { useContactedLeadsList, useMarkLeadContacted } from "../../features/leads/api";
import {
  BRAND_LABEL,
  BRAND_OPTIONS,
  BRAND_VARIANT,
  STATUS_LABEL,
  STATUS_OPTIONS,
  STATUS_ROW_TINT,
  STATUS_VARIANT,
} from "../../features/leads/constants";
import { LeadNoteCell } from "../../features/leads/components/LeadNoteCell";
import { LeadActivityModal } from "../../features/leads/components/LeadActivityModal";
import { useLeadSourcesList } from "../../features/lead-sources/api";
import { useUsersList } from "../../features/users/api";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { Skeleton } from "../../components/ui/Skeleton";
import { Table, Tbody, Td, Th, Thead, Tr } from "../../components/ui/Table";

/** UTC calendar day, matching the gte/lte day-range the backend filters activity by. */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Tick-mark button confirming a real outreach happened -- distinct from the row's own
 *  "Latest Activity" column, which just reflects the last tracked audit/message/edit and
 *  isn't necessarily a real contact. */
function ContactedToggle({ leadId, contactedAt }: { leadId: string; contactedAt: string | null }) {
  const { mutate, isPending } = useMarkLeadContacted();
  const isContacted = contactedAt !== null;

  return (
    <button
      type="button"
      title={isContacted ? "Contacted — click to unmark" : "Mark as contacted"}
      aria-pressed={isContacted}
      disabled={isPending}
      onClick={() => mutate({ id: leadId, input: { contacted: !isContacted } })}
      className={clsx(
        "flex h-7 w-7 items-center justify-center rounded-full border transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-60",
        isContacted
          ? "border-green-600 bg-green-600 text-white hover:bg-green-700"
          : "border-slate-300 text-transparent hover:border-green-500 hover:text-green-500 dark:border-slate-600",
      )}
    >
      <Check size={16} />
    </button>
  );
}

function SkeletonRows({ rows, columns }: { rows: number; columns: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <Tr key={rowIndex}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Td key={colIndex}>
              <Skeleton className="h-4 w-full max-w-32" />
            </Td>
          ))}
        </Tr>
      ))}
    </>
  );
}

export function LeadContactedTodayPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: sources } = useLeadSourcesList();
  const { data: usersPage } = useUsersList({ pageSize: 100, sortBy: "firstName", sortOrder: "asc" });

  const page = Number(searchParams.get("page") ?? "1");
  const date = searchParams.get("date") || todayIso();
  const search = searchParams.get("search") ?? "";
  const status = (searchParams.get("status") ?? "") as LeadStatus | "";
  const sourceId = searchParams.get("sourceId") ?? "";
  const ownerId = searchParams.get("ownerId") ?? "";
  const contacted = (searchParams.get("contacted") ?? "") as "yes" | "no" | "";
  const brand = (searchParams.get("brand") ?? "") as LeadBrand | "";

  const { data, isLoading, isError, refetch } = useContactedLeadsList({
    date,
    page,
    pageSize: 20,
    search: search || undefined,
    status: status || undefined,
    sourceId: sourceId || undefined,
    ownerId: ownerId || undefined,
    brand: brand || undefined,
    contacted: contacted || undefined,
  });

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.set("page", "1");
    setSearchParams(next);
  }

  const isToday = date === todayIso();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Contacted Today</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Every lead with a tracked action on the selected day — calls, emails, messages, status/stage
          changes, edits, notes, and owner changes — one row per lead, showing its most recent activity.
        </p>
      </div>

      <Card className="flex flex-wrap items-end gap-3 p-4">
        <div className="flex flex-col gap-1.5">
          <Input
            label="Date"
            type="date"
            className="w-40"
            value={date}
            onChange={(e) => updateParam("date", e.target.value || todayIso())}
          />
        </div>
        {!isToday && (
          <Button variant="secondary" onClick={() => updateParam("date", todayIso())}>
            Today
          </Button>
        )}
        <div className="flex min-w-56 flex-1 flex-col gap-1.5">
          <label htmlFor="contacted-search" className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Search
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <Input
              id="contacted-search"
              placeholder="Name, phone, email, or company"
              defaultValue={search}
              className="pl-9"
              onChange={(e) => updateParam("search", e.target.value)}
            />
          </div>
        </div>
        <Select label="Status" className="w-44" value={status} onChange={(e) => updateParam("status", e.target.value)}>
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </Select>
        <Select label="Source" className="w-48" value={sourceId} onChange={(e) => updateParam("sourceId", e.target.value)}>
          <option value="">All sources</option>
          {sources?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <Select label="Owner" className="w-48" value={ownerId} onChange={(e) => updateParam("ownerId", e.target.value)}>
          <option value="">All owners</option>
          {usersPage?.items.map((u) => (
            <option key={u.id} value={u.id}>
              {u.firstName} {u.lastName}
            </option>
          ))}
        </Select>
        <Select label="Contacted" className="w-40" value={contacted} onChange={(e) => updateParam("contacted", e.target.value)}>
          <option value="">All leads</option>
          <option value="yes">Contacted</option>
          <option value="no">Not contacted</option>
        </Select>
        <Select label="Brand" className="w-40" value={brand} onChange={(e) => updateParam("brand", e.target.value)}>
          <option value="">All brands</option>
          {BRAND_OPTIONS.map((b) => (
            <option key={b} value={b}>
              {BRAND_LABEL[b]}
            </option>
          ))}
        </Select>
      </Card>

      {isError ? (
        <Card className="p-6">
          <ErrorState onRetry={() => refetch()} />
        </Card>
      ) : (
        <>
          <Table>
            <Thead>
              <Tr>
                <Th>Contacted</Th>
                <Th>Name</Th>
                <Th>Company</Th>
                <Th>Status</Th>
                <Th>Owner</Th>
                <Th>Brand</Th>
                <Th>Note</Th>
                <Th>Report</Th>
                <Th>Latest Activity</Th>
                <Th>Activity Time</Th>
              </Tr>
            </Thead>
            <Tbody>
              {isLoading ? (
                <SkeletonRows rows={8} columns={10} />
              ) : (
                data?.items.map((lead) => (
                  <Tr key={lead.id} className={STATUS_ROW_TINT[lead.status]}>
                    <Td>
                      <ContactedToggle leadId={lead.id} contactedAt={lead.contactedAt} />
                    </Td>
                    <Td>
                      <Link to={`/leads/${lead.id}`} className="font-medium text-brand-600 hover:underline dark:text-brand-500">
                        {lead.firstName} {lead.lastName}
                      </Link>
                      {lead.email && <div className="text-xs text-slate-500 dark:text-slate-400">{lead.email}</div>}
                    </Td>
                    <Td>{lead.company ?? "—"}</Td>
                    <Td>
                      <Badge variant={STATUS_VARIANT[lead.status]}>{STATUS_LABEL[lead.status]}</Badge>
                    </Td>
                    <Td>{lead.ownerName ?? <span className="text-slate-400 dark:text-slate-500">Unassigned</span>}</Td>
                    <Td>
                      <Badge variant={BRAND_VARIANT[lead.brand]}>{BRAND_LABEL[lead.brand]}</Badge>
                    </Td>
                    <Td>
                      <LeadNoteCell leadId={lead.id} ownerId={lead.ownerId} />
                    </Td>
                    <Td>
                      <LeadActivityModal leadId={lead.id} leadLabel={`${lead.firstName} ${lead.lastName}`} />
                    </Td>
                    <Td>{lead.latestActivityLabel}</Td>
                    <Td>
                      {new Date(lead.latestActivityAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </Td>
                  </Tr>
                ))
              )}
              {data?.items.length === 0 && (
                <Tr>
                  <Td colSpan={10}>
                    <EmptyState
                      icon={CalendarClock}
                      title="No activity"
                      description="No leads had a tracked call, email, message, edit, or status change on this date."
                    />
                  </Td>
                </Tr>
              )}
            </Tbody>
          </Table>

          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
              <span>
                Page {data.page} of {data.totalPages} ({data.total} leads)
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
