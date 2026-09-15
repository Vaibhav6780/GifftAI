import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Download, Pencil, Plus, Search, Target } from "lucide-react";
import type { LeadBrand, LeadStatus, LeadSummary, UserSummary } from "@gifftai/shared";
import {
  useAssignLead,
  useBulkAssignLeads,
  useDeleteLead,
  useExportLeads,
  useLeadsList,
  useLeadStats,
  useUpdateLead,
} from "../../features/leads/api";
import { LeadNoteCell } from "../../features/leads/components/LeadNoteCell";
import { LeadFollowupCell } from "../../features/leads/components/LeadFollowupCell";
import { LeadActivityModal } from "../../features/leads/components/LeadActivityModal";
import { LeadStatsRow } from "../../features/leads/components/LeadStatsRow";
import {
  BRAND_LABEL,
  BRAND_OPTIONS,
  BRAND_VARIANT,
  STATUS_LABEL,
  STATUS_OPTIONS,
  STATUS_ROW_TINT,
  STATUS_VARIANT,
} from "../../features/leads/constants";
import { useLeadSourcesList } from "../../features/lead-sources/api";
import { useUsersList } from "../../features/users/api";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Badge } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { Skeleton } from "../../components/ui/Skeleton";
import { Table, Tbody, Td, Th, Thead, Tr } from "../../components/ui/Table";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { toast } from "../../components/ui/Toast";
import { useHasPermission } from "../../hooks/usePermission";

/** UTC calendar day, matching the gte/lte day-range the backend filters `createdAt` by. */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function initials(fullName: string): string {
  return fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

/** Keeps the table headers (and filter bar / stat tiles above it) in place while a query is
 *  in flight, instead of swapping the whole view for a centered spinner — less layout shift,
 *  and the page still reads as "the leads table" rather than a blank loading screen. */
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

export function LeadsListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const canCreate = useHasPermission("leads:create");
  const canDelete = useHasPermission("leads:delete");
  const canAssign = useHasPermission("leads:assign");
  const canExport = useHasPermission("leads:export");
  const { data: sources } = useLeadSourcesList();
  const { data: usersPage } = useUsersList({ pageSize: 100, sortBy: "firstName", sortOrder: "asc" });
  const deleteLead = useDeleteLead();
  const bulkAssignLeads = useBulkAssignLeads();
  const exportLeads = useExportLeads();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkOwnerId, setBulkOwnerId] = useState("");

  const page = Number(searchParams.get("page") ?? "1");
  const search = searchParams.get("search") ?? "";
  const status = (searchParams.get("status") ?? "") as LeadStatus | "";
  const sourceId = searchParams.get("sourceId") ?? "";
  const ownerId = searchParams.get("ownerId") ?? "";
  // Which product's leads to show. Defaults to GIFTTAI (set by sidebar nav link).
  // Pick "All brands" to clear it and see all leads regardless of brand.
  const brand = (searchParams.get("brand") ?? "") as LeadBrand | "";
  // Absent param -> defaults to today; "all" is the explicit escape hatch to see every date.
  const createdDateParam = searchParams.get("createdDate");
  const isAllDates = createdDateParam === "all";
  const createdDate = isAllDates ? "" : (createdDateParam ?? todayIso());

  const { data, isLoading, isError, refetch } = useLeadsList({
    page,
    pageSize: 20,
    search: search || undefined,
    status: status || undefined,
    sourceId: sourceId || undefined,
    ownerId: ownerId || undefined,
    brand: brand || undefined,
    createdDate: isAllDates ? undefined : createdDate,
  });
  // Deliberately excludes `status` -- the tiles show every status's count under the
  // other active filters, regardless of which one (if any) is currently selected.
  const { data: statusCounts, isLoading: statsLoading } = useLeadStats({
    search: search || undefined,
    sourceId: sourceId || undefined,
    ownerId: ownerId || undefined,
    brand: brand || undefined,
    createdDate: isAllDates ? undefined : createdDate,
  });

  const pendingLead = data?.items.find((l) => l.id === pendingDeleteId);

  // Selection is page-scoped — clear it whenever the query result changes
  // (new page, new filters, or the current page's data was refetched) so
  // stale ids from a previous page/filter can never be bulk-assigned.
  useEffect(() => {
    setSelectedIds(new Set());
  }, [data]);

  const allOnPageSelected = Boolean(data?.items.length) && data!.items.every((lead) => selectedIds.has(lead.id));

  function toggleSelectAll() {
    if (!data) return;
    setSelectedIds(allOnPageSelected ? new Set() : new Set(data.items.map((lead) => lead.id)));
  }

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.set("page", "1");
    setSearchParams(next);
  }

  function handleConfirmDelete() {
    if (!pendingDeleteId) return;
    deleteLead.mutate(pendingDeleteId, {
      onSuccess: () => {
        toast.success("Lead deleted");
        setPendingDeleteId(null);
      },
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : "Failed to delete lead");
        setPendingDeleteId(null);
      },
    });
  }

  function handleExport() {
    exportLeads.mutate(
      {
        search: search || undefined,
        status: status || undefined,
        sourceId: sourceId || undefined,
        ownerId: ownerId || undefined,
        brand: brand || undefined,
        createdDate: isAllDates ? undefined : createdDate,
      },
      {
        onSuccess: (blob) => {
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `leads-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
          document.body.appendChild(link);
          link.click();
          link.remove();
          URL.revokeObjectURL(url);
        },
        onError: (error) => {
          toast.error(error instanceof Error ? error.message : "Failed to export leads");
        },
      },
    );
  }

  function handleBulkAssign() {
    if (selectedIds.size === 0) return;
    bulkAssignLeads.mutate(
      { leadIds: Array.from(selectedIds), ownerId: bulkOwnerId || null },
      {
        onSuccess: (result) => {
          toast.success(`Reassigned ${result.count} lead${result.count === 1 ? "" : "s"}`);
          setSelectedIds(new Set());
          setBulkOwnerId("");
        },
        onError: (error) => {
          toast.error(error instanceof Error ? error.message : "Failed to reassign leads");
        },
      },
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Leads</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Track and qualify incoming leads.</p>
        </div>
        <div className="flex items-center gap-2">
          {canExport && (
            <Button variant="secondary" onClick={handleExport} isLoading={exportLeads.isPending}>
              <Download size={16} /> Export
            </Button>
          )}
          {canCreate && (
            <Link to={brand ? `/leads/new?brand=${brand}` : "/leads/new"}>
              <Button>
                <Plus size={16} /> New Lead
              </Button>
            </Link>
          )}
        </div>
      </div>

      <LeadStatsRow
        counts={statusCounts}
        isLoading={statsLoading}
        activeStatus={status}
        onSelectStatus={(next) => updateParam("status", next)}
      />

      <Card className="flex flex-wrap items-end gap-3 p-4">
        <div className="flex min-w-56 flex-1 flex-col gap-1.5">
          <label htmlFor="lead-search" className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Search
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <Input
              id="lead-search"
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
        <Select label="Brand" className="w-40" value={brand} onChange={(e) => updateParam("brand", e.target.value)}>
          <option value="">All brands</option>
          {BRAND_OPTIONS.map((b) => (
            <option key={b} value={b}>
              {BRAND_LABEL[b]}
            </option>
          ))}
        </Select>
        <Input
          label="Date added"
          type="date"
          className="w-40"
          value={createdDate}
          onChange={(e) => updateParam("createdDate", e.target.value || "all")}
        />
        {!isAllDates && (
          <Button variant="secondary" onClick={() => updateParam("createdDate", "all")}>
            All dates
          </Button>
        )}
      </Card>

      {canAssign && selectedIds.size > 0 && (
        <Card className="flex flex-wrap items-center gap-3 p-4">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {selectedIds.size} lead{selectedIds.size === 1 ? "" : "s"} selected
          </span>
          <Select className="w-56" value={bulkOwnerId} onChange={(e) => setBulkOwnerId(e.target.value)}>
            <option value="">Unassigned</option>
            {usersPage?.items.map((u) => (
              <option key={u.id} value={u.id}>
                {u.firstName} {u.lastName}
              </option>
            ))}
          </Select>
          <Button onClick={handleBulkAssign} isLoading={bulkAssignLeads.isPending}>
            Assign
          </Button>
          <Button variant="ghost" onClick={() => setSelectedIds(new Set())}>
            Clear selection
          </Button>
        </Card>
      )}

      {isError ? (
        <Card className="p-6">
          <ErrorState onRetry={() => refetch()} />
        </Card>
      ) : (
        <>
          <Table>
            <Thead>
              <Tr>
                {canAssign && (
                  <Th>
                    <input
                      type="checkbox"
                      aria-label="Select all leads on this page"
                      checked={allOnPageSelected}
                      onChange={toggleSelectAll}
                      className="size-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-600"
                    />
                  </Th>
                )}
                <Th>Name</Th>
                <Th>Phone</Th>
                <Th>Company</Th>
                <Th>Status</Th>
                <Th>Score</Th>
                <Th>Owner</Th>
                <Th>Source</Th>
                <Th>Brand</Th>
                <Th>Date Added</Th>
                <Th>Note</Th>
                <Th>Report</Th>
                <Th>Follow-up</Th>
                <Th />
              </Tr>
            </Thead>
            <Tbody>
              {isLoading ? (
                <SkeletonRows rows={8} columns={canAssign ? 14 : 13} />
              ) : (
                data?.items.map((lead) => (
                  <LeadRow
                    key={lead.id}
                    lead={lead}
                    canAssign={canAssign}
                    canDelete={canDelete}
                    users={usersPage?.items ?? []}
                    selected={selectedIds.has(lead.id)}
                    onToggleSelect={() => toggleRow(lead.id)}
                    onDeleteClick={() => setPendingDeleteId(lead.id)}
                  />
                ))
              )}
              {data?.items.length === 0 && (
                <Tr>
                  <Td colSpan={canAssign ? 14 : 13}>
                    <EmptyState
                      icon={Target}
                      title="No leads found"
                      description="Try adjusting your filters, or create a new lead."
                      action={
                        canCreate && (
                          <Link to={brand ? `/leads/new?brand=${brand}` : "/leads/new"}>
                            <Button size="sm">
                              <Plus size={16} /> New Lead
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

      <ConfirmDialog
        open={Boolean(pendingDeleteId)}
        title="Delete lead"
        description={`Are you sure you want to delete "${pendingLead?.firstName} ${pendingLead?.lastName}"? This cannot be undone.`}
        confirmLabel="Delete"
        isLoading={deleteLead.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
}

function LeadRow({
  lead,
  canAssign,
  canDelete,
  users,
  selected,
  onToggleSelect,
  onDeleteClick,
}: {
  lead: LeadSummary;
  canAssign: boolean;
  canDelete: boolean;
  users: UserSummary[];
  selected: boolean;
  onToggleSelect: () => void;
  onDeleteClick: () => void;
}) {
  const updateLead = useUpdateLead(lead.id);
  const assignLead = useAssignLead(lead.id);
  const canUpdateStatus = useHasPermission("leads:update");

  function handleStatusChange(status: LeadStatus) {
    if (status === lead.status) return;
    updateLead.mutate(
      { status },
      {
        onSuccess: () => toast.success("Status updated"),
        onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to update status"),
      },
    );
  }

  function handleOwnerChange(ownerId: string) {
    if ((ownerId || null) === lead.ownerId) return;
    assignLead.mutate(
      { ownerId: ownerId || null },
      {
        onSuccess: () => toast.success(ownerId ? "Lead assigned" : "Lead unassigned"),
        onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to assign lead"),
      },
    );
  }

  return (
    <Tr className={STATUS_ROW_TINT[lead.status]}>
      {canAssign && (
        <Td>
          <input
            type="checkbox"
            aria-label={`Select ${lead.firstName} ${lead.lastName}`}
            checked={selected}
            onChange={onToggleSelect}
            className="size-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-600"
          />
        </Td>
      )}
      <Td>
        <div className="flex items-center gap-2">
          <Link to={`/leads/${lead.id}`} aria-label={`Edit ${lead.firstName} ${lead.lastName}`}>
            <Button variant="ghost" size="sm" className="p-1.5">
              <Pencil size={14} />
            </Button>
          </Link>
          <div>
            <Link
              to={`/leads/${lead.id}`}
              className="font-medium text-brand-600 hover:underline dark:text-brand-500"
            >
              {lead.firstName} {lead.lastName}
            </Link>
            {lead.email && <div className="text-xs text-slate-500 dark:text-slate-400">{lead.email}</div>}
          </div>
        </div>
      </Td>
      <Td>{lead.phone ?? "—"}</Td>
      <Td>{lead.company ?? "—"}</Td>
      <Td>
        {canUpdateStatus ? (
          <Select
            className="w-40"
            value={lead.status}
            disabled={updateLead.isPending}
            onChange={(e) => handleStatusChange(e.target.value as LeadStatus)}
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABEL[status]}
              </option>
            ))}
          </Select>
        ) : (
          <Badge variant={STATUS_VARIANT[lead.status]}>{STATUS_LABEL[lead.status]}</Badge>
        )}
      </Td>
      <Td>{lead.score}</Td>
      <Td>
        <div className="flex items-center gap-2">
          {lead.ownerId && lead.ownerName && (
            <span
              className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[10px] font-semibold text-white"
              title={lead.ownerName}
            >
              {initials(lead.ownerName)}
            </span>
          )}
          {canAssign ? (
            <Select
              className="w-36"
              value={lead.ownerId ?? ""}
              disabled={assignLead.isPending}
              onChange={(e) => handleOwnerChange(e.target.value)}
            >
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName}
                </option>
              ))}
            </Select>
          ) : lead.ownerId ? (
            <Link to={`/leads?ownerId=${lead.ownerId}`} className="hover:underline">
              {lead.ownerName}
            </Link>
          ) : (
            <span className="text-slate-400 dark:text-slate-500">Unassigned</span>
          )}
        </div>
      </Td>
      <Td>{lead.sourceName ?? "—"}</Td>
      <Td>
        <Badge variant={BRAND_VARIANT[lead.brand]}>{BRAND_LABEL[lead.brand]}</Badge>
      </Td>
      <Td>{new Date(lead.createdAt).toLocaleDateString()}</Td>
      <Td>
        <LeadNoteCell leadId={lead.id} ownerId={lead.ownerId} />
      </Td>
      <Td>
        <LeadActivityModal leadId={lead.id} leadLabel={`${lead.firstName} ${lead.lastName}`} />
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
        {canDelete && (
          <Button variant="ghost" size="sm" onClick={onDeleteClick}>
            Delete
          </Button>
        )}
      </Td>
    </Tr>
  );
}
