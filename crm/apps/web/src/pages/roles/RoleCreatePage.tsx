import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { createRoleSchema, type CreateRoleInput, type PermissionKey } from "@gifftai/shared";
import { useCreateRole } from "../../features/roles/api";
import { usePermissionCatalog } from "../../features/permissions/api";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { toast } from "../../components/ui/Toast";
import { RolePermissionPicker } from "./RolePermissionPicker";

export function RoleCreatePage() {
  const navigate = useNavigate();
  const createRole = useCreateRole();
  const { data: groups, isLoading } = usePermissionCatalog();
  const [permissionKeys, setPermissionKeys] = useState<PermissionKey[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateRoleInput>({ resolver: zodResolver(createRoleSchema) });

  const onSubmit = handleSubmit((data) => {
    createRole.mutate(
      { ...data, permissionKeys },
      {
        onSuccess: () => {
          toast.success("Role created");
          navigate("/roles", { replace: true });
        },
        onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to create role"),
      },
    );
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">New Role</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Define a custom role and its permissions.</p>
      </div>

      <Card className="max-w-3xl p-6">
        <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
          <Input label="Name" error={errors.name?.message} {...register("name")} />
          <Textarea label="Description" error={errors.description?.message} {...register("description")} />

          <div>
            <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Permissions</span>
            {isLoading || !groups ? (
              <Spinner />
            ) : (
              <RolePermissionPicker groups={groups} selected={permissionKeys} onChange={setPermissionKeys} />
            )}
          </div>

          <div className="mt-2 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => navigate("/roles")}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createRole.isPending}>
              Create role
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
