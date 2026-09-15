import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useParams } from "react-router-dom";
import { updateRoleSchema, type PermissionKey, type UpdateRoleInput } from "@gifftai/shared";
import { useRole, useSetRolePermissions, useUpdateRole } from "../../features/roles/api";
import { usePermissionCatalog } from "../../features/permissions/api";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { PageSpinner, Spinner } from "../../components/ui/Spinner";
import { ErrorState } from "../../components/ui/ErrorState";
import { toast } from "../../components/ui/Toast";
import { RolePermissionPicker } from "./RolePermissionPicker";

export function RoleEditPage() {
  const { id } = useParams<{ id: string }>();
  const { data: role, isLoading, isError, refetch } = useRole(id);
  const { data: groups, isLoading: isCatalogLoading } = usePermissionCatalog();

  const updateRole = useUpdateRole(id!);
  const setPermissions = useSetRolePermissions(id!);

  const [permissionKeys, setPermissionKeys] = useState<PermissionKey[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateRoleInput>({ resolver: zodResolver(updateRoleSchema) });

  useEffect(() => {
    if (!role) return;
    reset({ name: role.name, description: role.description ?? undefined });
    setPermissionKeys(role.permissions);
  }, [role, reset]);

  if (isLoading) return <PageSpinner />;
  if (isError || !role) return <ErrorState description="Couldn't load this role." onRetry={() => refetch()} />;

  const onSubmitDetails = handleSubmit((data) => {
    updateRole.mutate(data, {
      onSuccess: () => toast.success("Role updated"),
      onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to update role"),
    });
  });

  function handleSavePermissions() {
    setPermissions.mutate(
      { permissionKeys },
      {
        onSuccess: () => toast.success("Permissions updated"),
        onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to update permissions"),
      },
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{role.name}</h1>
        {role.isSystem && <Badge variant="info">System role</Badge>}
      </div>

      <Card className="max-w-3xl p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Details</h2>
        <form className="flex flex-col gap-4" onSubmit={onSubmitDetails} noValidate>
          <Input
            label="Name"
            disabled={role.isSystem}
            error={errors.name?.message}
            {...register("name")}
          />
          <Textarea label="Description" error={errors.description?.message} {...register("description")} />
          <div className="flex justify-end">
            <Button type="submit" isLoading={updateRole.isPending}>
              Save details
            </Button>
          </div>
        </form>
      </Card>

      <Card className="max-w-3xl p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Permissions</h2>
        {isCatalogLoading || !groups ? (
          <Spinner />
        ) : (
          <RolePermissionPicker groups={groups} selected={permissionKeys} onChange={setPermissionKeys} />
        )}
        <div className="mt-4 flex justify-end">
          <Button onClick={handleSavePermissions} isLoading={setPermissions.isPending}>
            Save permissions
          </Button>
        </div>
      </Card>
    </div>
  );
}
