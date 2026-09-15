import type { DashboardSourceCount } from "@gifftai/shared";
import { Card } from "../../../components/ui/Card";
import { LeadSourceBadge } from "../../leads/components/LeadSourceBadge";

export function LeadsBySourceList({ countsBySource }: { countsBySource: DashboardSourceCount[] }) {
  const maxCount = Math.max(1, ...countsBySource.map((row) => row.count));

  return (
    <Card className="p-6">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Leads by source</h2>
      {countsBySource.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">No leads yet.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {countsBySource.map((row) => (
            <li key={row.sourceId ?? "none"} className="flex items-center gap-3">
              <LeadSourceBadge sourceName={row.sourceName} />
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-brand-500"
                  style={{ width: `${(row.count / maxCount) * 100}%` }}
                />
              </div>
              <span className="w-8 text-right text-sm font-medium text-slate-700 dark:text-slate-300">
                {row.count}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
