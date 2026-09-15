import { Link } from "react-router-dom";
import type { LeadStatus } from "@gifftai/shared";
import { useLeadsList, useUpdateLead } from "../../features/leads/api";
import { LeadNoteCell } from "../../features/leads/components/LeadNoteCell";
import { LeadActivityModal } from "../../features/leads/components/LeadActivityModal";
import { STATUS_LABEL, STATUS_OPTIONS, STATUS_ROW_TINT, STATUS_VARIANT } from "../../features/leads/constants";
import { useIsAssignedOrPrivileged } from "../../hooks/usePermission";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Select } from "../../components/ui/Select";
import { Spinner } from "../../components/ui/Spinner";
import { toast } from "../../components/ui/Toast";
import { Table, Tbody, Td, Th, Thead, Tr } from "../../components/ui/Table";

const SHOWN = 10;

function StatusCell({ leadId, ownerId, status }: { leadId: string; ownerId: string | null; status: LeadStatus }) {
  const canManage = useIsAssignedOrPrivileged(ownerId);
  const updateLead = useUpdateLead(leadId);

  if (!canManage) return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>;

  return (
    <Select
      className="w-40"
      value={status}
      disabled={updateLead.isPending}
      onChange={(e) => {
        updateLead.mutate(
          { status: e.target.value as LeadStatus },
          { onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to update status") },
        );
      }}
    >
      {STATUS_OPTIONS.map((s) => (
        <option key={s} value={s}>
          {STATUS_LABEL[s]}
        </option>
      ))}
    </Select>
  );
}

export function AssignedLeadsTable({ userId }: { userId: string }) {
  const { data, isLoading } = useLeadsList({ ownerId: userId, pageSize: SHOWN, sortBy: "createdAt", sortOrder: "desc" });

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Assigned Leads {data ? `(${data.total})` : ""}
        </h2>
        <Link to={`/leads?ownerId=${userId}`} className="text-sm text-brand-600 hover:underline dark:text-brand-500">
          View all
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Spinner />
        </div>
      ) : !data?.items.length ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">No leads assigned.</p>
      ) : (
        <Table>
          <Thead>
            <Tr>
              <Th>Lead</Th>
              <Th>Status</Th>
              <Th>Note</Th>
              <Th>Report</Th>
            </Tr>
          </Thead>
          <Tbody>
            {data.items.map((lead) => (
              <Tr key={lead.id} className={STATUS_ROW_TINT[lead.status]}>
                <Td>
                  <Link
                    to={`/leads/${lead.id}`}
                    className="font-medium text-brand-600 hover:underline dark:text-brand-500"
                  >
                    {lead.firstName} {lead.lastName}
                  </Link>
                </Td>
                <Td>
                  <StatusCell leadId={lead.id} ownerId={lead.ownerId} status={lead.status} />
                </Td>
                <Td>
                  <LeadNoteCell leadId={lead.id} ownerId={lead.ownerId} />
                </Td>
                <Td>
                  <LeadActivityModal leadId={lead.id} leadLabel={`${lead.firstName} ${lead.lastName}`} />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </Card>
  );
}
