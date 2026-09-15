import { useState } from "react";
import { Link } from "react-router-dom";
import { Building2, Plus } from "lucide-react";
import { useDeleteDepartment, useDepartmentsList } from "../../features/departments/api";
import { buildTree } from "../../lib/tree";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { PageSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { Table, Tbody, Td, Th, Thead, Tr } from "../../components/ui/Table";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { toast } from "../../components/ui/Toast";
import { useHasPermission } from "../../hooks/usePermission";

export function DepartmentsListPage() {
  const canCreate = useHasPermission("departments:create");
  const canDelete = useHasPermission("departments:delete");
  const { data: departments, isLoading, isError, refetch } = useDepartmentsList();
  const deleteDepartment = useDeleteDepartment();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const tree = departments ? buildTree(departments) : [];
  const pendingDepartment = departments?.find((d) => d.id === pendingDeleteId);

  function handleConfirmDelete() {
    if (!pendingDeleteId) return;
    deleteDepartment.mutate(pendingDeleteId, {
      onSuccess: () => {
        toast.success("Department deleted");
        setPendingDeleteId(null);
      },
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : "Failed to delete department");
        setPendingDeleteId(null);
      },
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Departments</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Organize users into departments.</p>
        </div>
        {canCreate && (
          <Link to="/departments/new">
            <Button>
              <Plus size={16} /> New Department
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
              <Th>Manager</Th>
              <Th>Users</Th>
              <Th />
            </Tr>
          </Thead>
          <Tbody>
            {tree.map(({ node, depth }) => (
              <Tr key={node.id}>
                <Td style={{ paddingLeft: `${1 + depth * 1.5}rem` }}>
                  <Link
                    to={`/departments/${node.id}`}
                    className="font-medium text-brand-600 hover:underline dark:text-brand-500"
                  >
                    {node.name}
                  </Link>
                </Td>
                <Td>{node.managerName ?? "—"}</Td>
                <Td>{node.userCount}</Td>
                <Td>
                  {canDelete && node.childCount === 0 && node.userCount === 0 && (
                    <Button variant="ghost" size="sm" onClick={() => setPendingDeleteId(node.id)}>
                      Delete
                    </Button>
                  )}
                </Td>
              </Tr>
            ))}
            {tree.length === 0 && (
              <Tr>
                <Td colSpan={4}>
                  <EmptyState
                    icon={Building2}
                    title="No departments yet"
                    description="Create a department to start organizing users."
                    action={
                      canCreate && (
                        <Link to="/departments/new">
                          <Button size="sm">
                            <Plus size={16} /> New Department
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
        title="Delete department"
        description={`Are you sure you want to delete "${pendingDepartment?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        isLoading={deleteDepartment.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
}
