import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { createDepartmentSchema, type CreateDepartmentInput } from "@gifftai/shared";
import { useCreateDepartment, useDepartmentsList } from "../../features/departments/api";
import { useUsersList } from "../../features/users/api";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";
import { toast } from "../../components/ui/Toast";

export function DepartmentCreatePage() {
  const navigate = useNavigate();
  const createDepartment = useCreateDepartment();
  const { data: departments } = useDepartmentsList();
  const { data: users } = useUsersList({ page: 1, pageSize: 100 });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateDepartmentInput>({ resolver: zodResolver(createDepartmentSchema) });

  const onSubmit = handleSubmit((data) => {
    createDepartment.mutate(data, {
      onSuccess: () => {
        toast.success("Department created");
        navigate("/departments", { replace: true });
      },
      onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to create department"),
    });
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">New Department</h1>
      </div>

      <Card className="max-w-xl p-6">
        <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
          <Input label="Name" error={errors.name?.message} {...register("name")} />

          <Select label="Parent department" error={errors.parentId?.message} {...register("parentId")}>
            <option value="">No parent</option>
            {departments?.map((d) => (
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

          <div className="mt-2 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => navigate("/departments")}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createDepartment.isPending}>
              Create department
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
