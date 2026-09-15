import { Card } from "../../components/ui/Card";
import { PageSpinner } from "../../components/ui/Spinner";
import { ErrorState } from "../../components/ui/ErrorState";
import { useAuthStore } from "../../features/auth/authStore";
import { useDashboardSummary } from "../../features/dashboard/api";
import { StatusTiles } from "../../features/dashboard/components/StatusTiles";
import { LeadsBySourceList } from "../../features/dashboard/components/LeadsBySourceList";
import { LeadListCard } from "../../features/dashboard/components/LeadListCard";

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading, isError, refetch } = useDashboardSummary();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Welcome back{user ? `, ${user.firstName}` : ""}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {data ? `${data.totalLeads} total leads` : "Sales overview and recent leads"}
        </p>
      </div>

      {isLoading ? (
        <PageSpinner />
      ) : isError || !data ? (
        <Card className="p-6">
          <ErrorState
            description="You don't have access to lead data, or something went wrong loading the dashboard."
            onRetry={() => refetch()}
          />
        </Card>
      ) : (
        <>
          <StatusTiles countsByStatus={data.countsByStatus} />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <LeadsBySourceList countsBySource={data.countsBySource} />
            <LeadListCard
              title={`My assigned leads (${data.myAssignedCount})`}
              leads={data.myAssignedLeads}
              emptyLabel="No leads assigned to you yet."
            />
          </div>
          <LeadListCard title="Recent leads" leads={data.recentLeads} emptyLabel="No leads yet." />
        </>
      )}
    </div>
  );
}
