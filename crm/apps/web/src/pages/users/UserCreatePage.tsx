import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { createUserSchema, type CreateUserInput } from "@gifftai/shared";
import { useCreateUser } from "../../features/users/api";
import { useDepartmentsList } from "../../features/departments/api";
import { useRolesList } from "../../features/roles/api";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";
import { toast } from "../../components/ui/Toast";

export function UserCreatePage() {
  const navigate = useNavigate();
  const createUser = useCreateUser();
  const { data: departments } = useDepartmentsList();
  const { data: roles } = useRolesList();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { roleIds: [] },
  });

  const onSubmit = handleSubmit((data) => {
    createUser.mutate(data, {
      onSuccess: () => {
        toast.success("User created — a welcome email has been sent");
        navigate("/users", { replace: true });
      },
      onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to create user"),
    });
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">New User</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          They'll receive an email to set their own password.
        </p>
      </div>

      <Card className="max-w-2xl p-6">
        <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
          <div className="grid grid-cols-2 gap-4">
            <Input label="First name" error={errors.firstName?.message} {...register("firstName")} />
            <Input label="Last name" error={errors.lastName?.message} {...register("lastName")} />
          </div>
          <Input label="Email" type="email" error={errors.email?.message} {...register("email")} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Phone" error={errors.phone?.message} {...register("phone")} />
            <Input label="Job title" error={errors.jobTitle?.message} {...register("jobTitle")} />
          </div>

          <Select label="Department" error={errors.departmentId?.message} {...register("departmentId")}>
            <option value="">No department</option>
            {departments?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>

          <Controller
            name="roleIds"
            control={control}
            render={({ field }) => (
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Roles</span>
                <div className="flex flex-col gap-2 rounded-lg border border-slate-300 p-3 dark:border-slate-700">
                  {roles?.map((role) => (
                    <label key={role.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={field.value?.includes(role.id) ?? false}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...(field.value ?? []), role.id]
                            : (field.value ?? []).filter((id) => id !== role.id);
                          field.onChange(next);
                        }}
                      />
                      {role.name}
                    </label>
                  ))}
                </div>
                {errors.roleIds && (
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.roleIds.message}</p>
                )}
              </div>
            )}
          />

          <div className="mt-2 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => navigate("/users")}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createUser.isPending}>
              Create user
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
