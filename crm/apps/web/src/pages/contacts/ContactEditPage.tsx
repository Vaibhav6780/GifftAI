import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useParams } from "react-router-dom";
import { updateContactSchema, type KycStatus, type UpdateContactInput } from "@gifftai/shared";
import { useContact, useDeleteContact, useUpdateContact } from "../../features/contacts/api";
import { useCompaniesList } from "../../features/companies/api";
import { useUsersList } from "../../features/users/api";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { PageSpinner } from "../../components/ui/Spinner";
import { ErrorState } from "../../components/ui/ErrorState";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { toast } from "../../components/ui/Toast";
import { useHasPermission } from "../../hooks/usePermission";

const KYC_VARIANT: Record<KycStatus, "info" | "success" | "danger"> = {
  PENDING: "info",
  VERIFIED: "success",
  REJECTED: "danger",
};

export function ContactEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const canDelete = useHasPermission("contacts:delete");

  const { data: contact, isLoading, isError, refetch } = useContact(id);
  const { data: companiesPage } = useCompaniesList({ pageSize: 100, sortBy: "name", sortOrder: "asc" });
  const { data: usersPage } = useUsersList({ pageSize: 100, sortBy: "firstName", sortOrder: "asc" });

  const updateContact = useUpdateContact(id!);
  const deleteContact = useDeleteContact();

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateContactInput>({ resolver: zodResolver(updateContactSchema) });

  useEffect(() => {
    if (!contact) return;
    reset({
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      phone: contact.phone,
      jobTitle: contact.jobTitle,
      kycStatus: contact.kycStatus,
      companyId: contact.companyId,
      ownerId: contact.ownerId,
    });
  }, [contact, reset]);

  if (isLoading) return <PageSpinner />;
  if (isError || !contact) return <ErrorState description="Couldn't load this contact." onRetry={() => refetch()} />;

  const onSubmit = handleSubmit((data) => {
    updateContact.mutate(data, {
      onSuccess: () => toast.success("Contact updated"),
      onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to update contact"),
    });
  });

  function handleDelete() {
    deleteContact.mutate(id!, {
      onSuccess: () => {
        toast.success("Contact deleted");
        navigate("/contacts");
      },
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : "Failed to delete contact");
        setConfirmDeleteOpen(false);
      },
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {contact.firstName} {contact.lastName}
          </h1>
          {contact.companyName && <p className="text-sm text-slate-500 dark:text-slate-400">{contact.companyName}</p>}
        </div>
        <Badge variant={KYC_VARIANT[contact.kycStatus]}>{contact.kycStatus}</Badge>
      </div>

      <Card className="max-w-2xl p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Details</h2>
        <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
          <div className="grid grid-cols-2 gap-4">
            <Input label="First name" error={errors.firstName?.message} {...register("firstName")} />
            <Input label="Last name" error={errors.lastName?.message} {...register("lastName")} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Email" type="email" error={errors.email?.message} {...register("email")} />
            <Input label="Phone" error={errors.phone?.message} {...register("phone")} />
          </div>
          <Input label="Job title" error={errors.jobTitle?.message} {...register("jobTitle")} />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Company"
              error={errors.companyId?.message}
              {...register("companyId", { setValueAs: (v) => v || null })}
            >
              <option value="">No company</option>
              {companiesPage?.items.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Select label="KYC status" error={errors.kycStatus?.message} {...register("kycStatus")}>
              <option value="PENDING">Pending</option>
              <option value="VERIFIED">Verified</option>
              <option value="REJECTED">Rejected</option>
            </Select>
          </div>

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

          <div className="flex justify-end">
            <Button type="submit" isLoading={updateContact.isPending}>
              Save details
            </Button>
          </div>
        </form>
      </Card>

      {canDelete && (
        <Card className="max-w-2xl p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Danger zone</h2>
          <Button variant="danger" onClick={() => setConfirmDeleteOpen(true)}>
            Delete contact
          </Button>
        </Card>
      )}

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Delete contact"
        description={`Are you sure you want to delete "${contact.firstName} ${contact.lastName}"? This cannot be undone.`}
        confirmLabel="Delete"
        isLoading={deleteContact.isPending}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </div>
  );
}
