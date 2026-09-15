import { Link } from "react-router-dom";
import type { LeadSummary } from "@gifftai/shared";
import { Card } from "../../../components/ui/Card";
import { Badge } from "../../../components/ui/Badge";
import { LeadSourceBadge } from "../../leads/components/LeadSourceBadge";
import { STATUS_LABEL, STATUS_VARIANT } from "../../leads/constants";

interface LeadListCardProps {
  title: string;
  leads: LeadSummary[];
  emptyLabel: string;
}

export function LeadListCard({ title, leads, emptyLabel }: LeadListCardProps) {
  return (
    <Card className="p-6">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
      {leads.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{emptyLabel}</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {leads.map((lead) => (
            <li key={lead.id} className="flex items-center justify-between gap-3 text-sm">
              <Link to={`/leads/${lead.id}`} className="min-w-0 flex-1 truncate font-medium hover:underline">
                {lead.firstName} {lead.lastName}
              </Link>
              <LeadSourceBadge sourceName={lead.sourceName} />
              <Badge variant={STATUS_VARIANT[lead.status]}>{STATUS_LABEL[lead.status]}</Badge>
              <span className="whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
                {new Date(lead.createdAt).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
