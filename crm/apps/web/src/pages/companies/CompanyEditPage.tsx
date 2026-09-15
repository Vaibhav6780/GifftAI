import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useParams } from "react-router-dom";
import { updateCompanySchema, type UpdateCompanyInput } from "@gifftai/shared";
import { useCompany, useDeleteCompany, useUpdateCompany } from "../../features/companies/api";
import { useUsersList } from "../../features/users/api";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Textarea } from "../../components/ui/Textarea";
import { Button } from "../../components/ui/Button";
import { PageSpinner } from "../../components/ui/Spinner";
import { ErrorState } from "../../components/ui/ErrorState";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { toast } from "../../components/ui/Toast";
import { useHasPermission } from "../../hooks/usePermission";

export function CompanyEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const canDelete = useHasPermission("companies:delete");

  const { data: company, isLoading, isError, refetch } = useCompany(id);
  const { data: usersPage } = useUsersList({ pageSize: 100, sortBy: "firstName", sortOrder: "asc" });

  const updateCompany = useUpdateCompany(id!);
  const deleteCompany = useDeleteCompany();

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateCompanyInput>({ resolver: zodResolver(updateCompanySchema) });

  useEffect(() => {
    if (!company) return;
    reset({
      name: company.name,
      domain: company.domain,
      industry: company.industry,
      size: company.size,
      website: company.website,
      phone: company.phone,
      description: company.description,
      ownerId: company.ownerId,
    });
  }, [company, reset]);

  if (isLoading) return <PageSpinner />;
  if (isError || !company) return <ErrorState description="Couldn't load this company." onRetry={() => refetch()} />;

  const onSubmit = handleSubmit((data) => {
    updateCompany.mutate(data, {
      onSuccess: () => toast.success("Company updated"),
      onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to update company"),
    });
  });

  function handleDelete() {
    deleteCompany.mutate(id!, {
      onSuccess: () => {
        toast.success("Company deleted");
        navigate("/companies");
      },
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : "Failed to delete company");
        setConfirmDeleteOpen(false);
      },
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{company.name}</h1>
        {company.industry && <p className="text-sm text-slate-500 dark:text-slate-400">{company.industry}</p>}
      </div>

      <Card className="max-w-2xl p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Details</h2>
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
              {...register("ownerId", { setValueAs: (v) => v || null })}
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

          <div className="flex justify-end">
            <Button type="submit" isLoading={updateCompany.isPending}>
              Save details
            </Button>
          </div>
        </form>
      </Card>

      {canDelete && (
        <Card className="max-w-2xl p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Danger zone</h2>
          <Button variant="danger" onClick={() => setConfirmDeleteOpen(true)}>
            Delete company
          </Button>
        </Card>
      )}

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Delete company"
        description={`Are you sure you want to delete "${company.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        isLoading={deleteCompany.isPending}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </div>
  );
}
