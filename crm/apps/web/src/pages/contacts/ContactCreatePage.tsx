import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { createContactSchema, type CreateContactInput } from "@gifftai/shared";
import { useCreateContact } from "../../features/contacts/api";
import { useCompaniesList } from "../../features/companies/api";
import { useUsersList } from "../../features/users/api";
import { useAuthStore } from "../../features/auth/authStore";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";
import { toast } from "../../components/ui/Toast";

export function ContactCreatePage() {
  const navigate = useNavigate();
  const createContact = useCreateContact();
  const { data: companiesPage } = useCompaniesList({ pageSize: 100, sortBy: "name", sortOrder: "asc" });
  const { data: usersPage } = useUsersList({ pageSize: 100, sortBy: "firstName", sortOrder: "asc" });
  const currentUser = useAuthStore((s) => s.user);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateContactInput>({
    resolver: zodResolver(createContactSchema),
    defaultValues: { ownerId: currentUser?.id },
  });

  const onSubmit = handleSubmit((data) => {
    createContact.mutate(data, {
      onSuccess: (contact) => {
        toast.success("Contact created");
        navigate(`/contacts/${contact.id}`, { replace: true });
      },
      onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to create contact"),
    });
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">New Contact</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Add a new contact.</p>
      </div>

      <Card className="max-w-2xl p-6">
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
              {...register("companyId", { setValueAs: (v) => v || undefined })}
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
            {...register("ownerId", { setValueAs: (v) => v || undefined })}
          >
            <option value="">Unassigned</option>
            {usersPage?.items.map((u) => (
              <option key={u.id} value={u.id}>
                {u.firstName} {u.lastName}
              </option>
            ))}
          </Select>

          <div className="mt-2 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => navigate("/contacts")}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createContact.isPending}>
              Create contact
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
