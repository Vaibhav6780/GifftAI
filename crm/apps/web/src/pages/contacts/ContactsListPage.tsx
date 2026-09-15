import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Plus, Search, UserSquare2 } from "lucide-react";
import type { KycStatus } from "@gifftai/shared";
import { useContactsList, useDeleteContact } from "../../features/contacts/api";
import { useCompaniesList } from "../../features/companies/api";
import { useUsersList } from "../../features/users/api";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Badge } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import { PageSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { Table, Tbody, Td, Th, Thead, Tr } from "../../components/ui/Table";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { toast } from "../../components/ui/Toast";
import { useHasPermission } from "../../hooks/usePermission";

const KYC_VARIANT: Record<KycStatus, "info" | "success" | "danger"> = {
  PENDING: "info",
  VERIFIED: "success",
  REJECTED: "danger",
};

export function ContactsListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const canCreate = useHasPermission("contacts:create");
  const canDelete = useHasPermission("contacts:delete");
  const { data: companiesPage } = useCompaniesList({ pageSize: 100, sortBy: "name", sortOrder: "asc" });
  const { data: usersPage } = useUsersList({ pageSize: 100, sortBy: "firstName", sortOrder: "asc" });
  const deleteContact = useDeleteContact();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const page = Number(searchParams.get("page") ?? "1");
  const search = searchParams.get("search") ?? "";
  const companyId = searchParams.get("companyId") ?? "";
  const ownerId = searchParams.get("ownerId") ?? "";
  const kycStatus = (searchParams.get("kycStatus") ?? "") as KycStatus | "";

  const { data, isLoading, isError, refetch } = useContactsList({
    page,
    pageSize: 20,
    search: search || undefined,
    companyId: companyId || undefined,
    ownerId: ownerId || undefined,
    kycStatus: kycStatus || undefined,
  });

  const pendingContact = data?.items.find((c) => c.id === pendingDeleteId);

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.set("page", "1");
    setSearchParams(next);
  }

  function handleConfirmDelete() {
    if (!pendingDeleteId) return;
    deleteContact.mutate(pendingDeleteId, {
      onSuccess: () => {
        toast.success("Contact deleted");
        setPendingDeleteId(null);
      },
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : "Failed to delete contact");
        setPendingDeleteId(null);
      },
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Contacts</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">People you're in touch with.</p>
        </div>
        {canCreate && (
          <Link to="/contacts/new">
            <Button>
              <Plus size={16} /> New Contact
            </Button>
          </Link>
        )}
      </div>

      <Card className="flex flex-wrap gap-3 p-4">
        <div className="relative flex-1 min-w-56">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <Input
            placeholder="Search by name or email"
            defaultValue={search}
            className="pl-9"
            onChange={(e) => updateParam("search", e.target.value)}
          />
        </div>
        <Select className="w-48" value={companyId} onChange={(e) => updateParam("companyId", e.target.value)}>
          <option value="">All companies</option>
          {companiesPage?.items.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select className="w-44" value={kycStatus} onChange={(e) => updateParam("kycStatus", e.target.value)}>
          <option value="">All KYC statuses</option>
          <option value="PENDING">Pending</option>
          <option value="VERIFIED">Verified</option>
          <option value="REJECTED">Rejected</option>
        </Select>
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
                <Th>Company</Th>
                <Th>KYC status</Th>
                <Th>Owner</Th>
                <Th />
              </Tr>
            </Thead>
            <Tbody>
              {data?.items.map((contact) => (
                <Tr key={contact.id}>
                  <Td>
                    <Link
                      to={`/contacts/${contact.id}`}
                      className="font-medium text-brand-600 hover:underline dark:text-brand-500"
                    >
                      {contact.firstName} {contact.lastName}
                    </Link>
                    {contact.email && (
                      <div className="text-xs text-slate-500 dark:text-slate-400">{contact.email}</div>
                    )}
                  </Td>
                  <Td>
                    {contact.companyId ? (
                      <Link to={`/companies/${contact.companyId}`} className="hover:underline">
                        {contact.companyName}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </Td>
                  <Td>
                    <Badge variant={KYC_VARIANT[contact.kycStatus]}>{contact.kycStatus}</Badge>
                  </Td>
                  <Td>
                    {contact.ownerId ? (
                      <Link to={`/contacts?ownerId=${contact.ownerId}`} className="hover:underline">
                        {contact.ownerName}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </Td>
                  <Td>
                    {canDelete && (
                      <Button variant="ghost" size="sm" onClick={() => setPendingDeleteId(contact.id)}>
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
                      icon={UserSquare2}
                      title="No contacts found"
                      description="Try adjusting your filters, or add a new contact."
                      action={
                        canCreate && (
                          <Link to="/contacts/new">
                            <Button size="sm">
                              <Plus size={16} /> New Contact
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
                Page {data.page} of {data.totalPages} ({data.total} contacts)
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
        title="Delete contact"
        description={`Are you sure you want to delete "${pendingContact?.firstName} ${pendingContact?.lastName}"? This cannot be undone.`}
        confirmLabel="Delete"
        isLoading={deleteContact.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
}
