import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useParams } from "react-router-dom";
import { updateDepartmentSchema, type UpdateDepartmentInput } from "@gifftai/shared";
import { useDepartment, useDepartmentsList, useUpdateDepartment } from "../../features/departments/api";
import { useUsersList } from "../../features/users/api";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";
import { PageSpinner } from "../../components/ui/Spinner";
import { ErrorState } from "../../components/ui/ErrorState";
import { toast } from "../../components/ui/Toast";

export function DepartmentEditPage() {
  const { id } = useParams<{ id: string }>();
  const { data: department, isLoading, isError, refetch } = useDepartment(id);
  const { data: departments } = useDepartmentsList();
  const { data: users } = useUsersList({ page: 1, pageSize: 100 });
  const updateDepartment = useUpdateDepartment(id!);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateDepartmentInput>({ resolver: zodResolver(updateDepartmentSchema) });

  useEffect(() => {
    if (!department) return;
    reset({ name: department.name, parentId: department.parentId, managerId: department.managerId });
  }, [department, reset]);

  if (isLoading) return <PageSpinner />;
  if (isError || !department) return <ErrorState description="Couldn't load this department." onRetry={() => refetch()} />;

  const onSubmit = handleSubmit((data) => {
    updateDepartment.mutate(data, {
      onSuccess: () => toast.success("Department updated"),
      onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to update department"),
    });
  });

  const otherDepartments = departments?.filter((d) => d.id !== id) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{department.name}</h1>
      </div>

      <Card className="max-w-xl p-6">
        <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
          <Input label="Name" error={errors.name?.message} {...register("name")} />

          <Select label="Parent department" error={errors.parentId?.message} {...register("parentId")}>
            <option value="">No parent</option>
            {otherDepartments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>

          <Select label="Manager" error={errors.managerId?.message} {...register("managerId")}>
            <option value="">No manager</option>
            {users?.items.map((u) => (
              <option key={u.id} value={u.id}>
                {u.firstName} {u.lastName}
              </option>
            ))}
          </Select>

          <div className="flex justify-end">
            <Button type="submit" isLoading={updateDepartment.isPending}>
              Save
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
