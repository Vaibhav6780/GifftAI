import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, ShieldCheck } from "lucide-react";
import { useDeleteRole, useRolesList } from "../../features/roles/api";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import { PageSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { Table, Tbody, Td, Th, Thead, Tr } from "../../components/ui/Table";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { toast } from "../../components/ui/Toast";
import { useHasPermission } from "../../hooks/usePermission";

export function RolesListPage() {
  const canCreate = useHasPermission("roles:create");
  const canDelete = useHasPermission("roles:delete");
  const { data: roles, isLoading, isError, refetch } = useRolesList();
  const deleteRole = useDeleteRole();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const pendingRole = roles?.find((r) => r.id === pendingDeleteId);

  function handleConfirmDelete() {
    if (!pendingDeleteId) return;
    deleteRole.mutate(pendingDeleteId, {
      onSuccess: () => {
        toast.success("Role deleted");
        setPendingDeleteId(null);
      },
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : "Failed to delete role");
        setPendingDeleteId(null);
      },
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Roles</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manage roles and their permissions.</p>
        </div>
        {canCreate && (
          <Link to="/roles/new">
            <Button>
              <Plus size={16} /> New Role
            </Button>
          </Link>
        )}
      </div>

      {isLoading ? (
        <PageSpinner />
      ) : isError ? (
        <Card className="p-6">
          <ErrorState onRetry={() => refetch()} />
        </Card>
      ) : (
        <Table>
          <Thead>
            <Tr>
              <Th>Name</Th>
              <Th>Description</Th>
              <Th>Permissions</Th>
              <Th>Users</Th>
              <Th />
            </Tr>
          </Thead>
          <Tbody>
            {roles?.map((role) => (
              <Tr key={role.id}>
                <Td>
                  <Link to={`/roles/${role.id}`} className="font-medium text-brand-600 hover:underline dark:text-brand-500">
                    {role.name}
                  </Link>
                  {role.isSystem && (
                    <Badge variant="info" className="ml-2">
                      System
                    </Badge>
                  )}
                </Td>
                <Td>{role.description ?? "—"}</Td>
                <Td>{role.permissionCount}</Td>
                <Td>{role.userCount}</Td>
                <Td>
                  {canDelete && !role.isSystem && role.userCount === 0 && (
                    <Button variant="ghost" size="sm" onClick={() => setPendingDeleteId(role.id)}>
                      Delete
                    </Button>
                  )}
                </Td>
              </Tr>
            ))}
            {roles?.length === 0 && (
              <Tr>
                <Td colSpan={5}>
                  <EmptyState
                    icon={ShieldCheck}
                    title="No roles found"
                    description="Create a role to start assigning permissions."
                    action={
                      canCreate && (
                        <Link to="/roles/new">
                          <Button size="sm">
                            <Plus size={16} /> New Role
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
      )}

      <ConfirmDialog
        open={Boolean(pendingDeleteId)}
        title="Delete role"
        description={`Are you sure you want to delete "${pendingRole?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        isLoading={deleteRole.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
}
