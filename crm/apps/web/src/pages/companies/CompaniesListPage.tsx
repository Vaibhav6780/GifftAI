import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Building, Plus, Search } from "lucide-react";
import { useCompaniesList, useDeleteCompany } from "../../features/companies/api";
import { useUsersList } from "../../features/users/api";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Card } from "../../components/ui/Card";
import { PageSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { Table, Tbody, Td, Th, Thead, Tr } from "../../components/ui/Table";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { toast } from "../../components/ui/Toast";
import { useHasPermission } from "../../hooks/usePermission";

export function CompaniesListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const canCreate = useHasPermission("companies:create");
  const canDelete = useHasPermission("companies:delete");
  const { data: usersPage } = useUsersList({ pageSize: 100, sortBy: "firstName", sortOrder: "asc" });
  const deleteCompany = useDeleteCompany();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const page = Number(searchParams.get("page") ?? "1");
  const search = searchParams.get("search") ?? "";
  const industry = searchParams.get("industry") ?? "";
  const ownerId = searchParams.get("ownerId") ?? "";

  const { data, isLoading, isError, refetch } = useCompaniesList({
    page,
    pageSize: 20,
    search: search || undefined,
    industry: industry || undefined,
    ownerId: ownerId || undefined,
  });

  const pendingCompany = data?.items.find((c) => c.id === pendingDeleteId);

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.set("page", "1");
    setSearchParams(next);
  }

  function handleConfirmDelete() {
    if (!pendingDeleteId) return;
    deleteCompany.mutate(pendingDeleteId, {
      onSuccess: () => {
        toast.success("Company deleted");
        setPendingDeleteId(null);
      },
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : "Failed to delete company");
        setPendingDeleteId(null);
      },
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Companies</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Accounts and organizations you work with.</p>
        </div>
        {canCreate && (
          <Link to="/companies/new">
            <Button>
              <Plus size={16} /> New Company
            </Button>
          </Link>
        )}
      </div>

      <Card className="flex flex-wrap gap-3 p-4">
        <div className="relative flex-1 min-w-56">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <Input
            placeholder="Search by name or domain"
            defaultValue={search}
            className="pl-9"
            onChange={(e) => updateParam("search", e.target.value)}
          />
        </div>
        <Input
          placeholder="Industry"
          defaultValue={industry}
          className="w-48"
          onChange={(e) => updateParam("industry", e.target.value)}
        />
        <Select className="w-48" value={ownerId} onChange={(e) => updateParam("ownerId", e.target.value)}>
          <option value="">All owners</option>
          {usersPage?.items.map((u) => (
            <option key={u.id} value={u.id}>
              {u.firstName} {u.lastName}
            </option>
          ))}
        </Select>
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
                <Th>Domain</Th>
                <Th>Industry</Th>
                <Th>Owner</Th>
                <Th />
              </Tr>
            </Thead>
            <Tbody>
              {data?.items.map((company) => (
                <Tr key={company.id}>
                  <Td>
                    <Link
                      to={`/companies/${company.id}`}
                      className="font-medium text-brand-600 hover:underline dark:text-brand-500"
                    >
                      {company.name}
                    </Link>
                  </Td>
                  <Td>{company.domain ?? "—"}</Td>
                  <Td>{company.industry ?? "—"}</Td>
                  <Td>
                    {company.ownerId ? (
                      <Link to={`/companies?ownerId=${company.ownerId}`} className="hover:underline">
                        {company.ownerName}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </Td>
                  <Td>
                    {canDelete && (
                      <Button variant="ghost" size="sm" onClick={() => setPendingDeleteId(company.id)}>
                        Delete
                      </Button>
                    )}
                  </Td>
                </Tr>
              ))}
              {data?.items.length === 0 && (
                <Tr>
                  <Td colSpan={5}>
                    <EmptyState
                      icon={Building}
                      title="No companies found"
                      description="Try adjusting your filters, or add a new company."
                      action={
                        canCreate && (
                          <Link to="/companies/new">
                            <Button size="sm">
                              <Plus size={16} /> New Company
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
                Page {data.page} of {data.totalPages} ({data.total} companies)
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
        title="Delete company"
        description={`Are you sure you want to delete "${pendingCompany?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        isLoading={deleteCompany.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
}
