import type { DashboardStatusCount } from "@gifftai/shared";
import { Card } from "../../../components/ui/Card";
import { Badge } from "../../../components/ui/Badge";
import { STATUS_LABEL, STATUS_VARIANT } from "../../leads/constants";

export function StatusTiles({ countsByStatus }: { countsByStatus: DashboardStatusCount[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {countsByStatus.map(({ status, count }) => (
        <Card key={status} className="p-4">
          <div className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{count}</div>
          <Badge variant={STATUS_VARIANT[status]} className="mt-2">
            {STATUS_LABEL[status]}
          </Badge>
        </Card>
      ))}
    </div>
  );
}
