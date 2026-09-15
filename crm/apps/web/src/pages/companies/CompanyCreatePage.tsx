import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { createCompanySchema, type CreateCompanyInput } from "@gifftai/shared";
import { useCreateCompany } from "../../features/companies/api";
import { useUsersList } from "../../features/users/api";
import { useAuthStore } from "../../features/auth/authStore";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Textarea } from "../../components/ui/Textarea";
import { Button } from "../../components/ui/Button";
import { toast } from "../../components/ui/Toast";

export function CompanyCreatePage() {
  const navigate = useNavigate();
  const createCompany = useCreateCompany();
  const { data: usersPage } = useUsersList({ pageSize: 100, sortBy: "firstName", sortOrder: "asc" });
  const currentUser = useAuthStore((s) => s.user);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateCompanyInput>({
    resolver: zodResolver(createCompanySchema),
    defaultValues: { ownerId: currentUser?.id },
  });

  const onSubmit = handleSubmit((data) => {
    createCompany.mutate(data, {
      onSuccess: (company) => {
        toast.success("Company created");
        navigate(`/companies/${company.id}`, { replace: true });
      },
      onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to create company"),
    });
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">New Company</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Add a new account or organization.</p>
      </div>

      <Card className="max-w-2xl p-6">
        <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
          <Input label="Name" error={errors.name?.message} {...register("name")} />

          <div className="grid grid-cols-2 gap-4">
            <Input label="Domain" error={errors.domain?.message} {...register("domain")} />
            <Input label="Website" error={errors.website?.message} {...register("website")} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Industry" error={errors.industry?.message} {...register("industry")} />
            <Input label="Size" error={errors.size?.message} {...register("size")} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Phone" error={errors.phone?.message} {...register("phone")} />
            <Select
              label="Owner"
              error={errors.ownerId?.message}
              {...register("ownerId", { setValueAs: (v) => v || undefined })}
            >
              <option value="">Unassigned</option>
              {usersPage?.items.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName}
                </option>
              ))}
            </Select>
          </div>

          <Textarea label="Description" rows={4} error={errors.description?.message} {...register("description")} />

          <div className="mt-2 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => navigate("/companies")}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createCompany.isPending}>
              Create company
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
