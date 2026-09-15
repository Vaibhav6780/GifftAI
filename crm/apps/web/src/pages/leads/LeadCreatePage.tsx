import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createLeadSchema, type CreateLeadInput, type LeadBrand } from "@gifftai/shared";
import { useCreateLead } from "../../features/leads/api";
import { BRAND_LABEL, BRAND_OPTIONS, STATUS_LABEL, STATUS_OPTIONS } from "../../features/leads/constants";
import { useLeadSourcesList } from "../../features/lead-sources/api";
import { useUsersList } from "../../features/users/api";
import { useAuthStore } from "../../features/auth/authStore";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Textarea } from "../../components/ui/Textarea";
import { Button } from "../../components/ui/Button";
import { toast } from "../../components/ui/Toast";

export function LeadCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const createLead = useCreateLead();
  const { data: sources } = useLeadSourcesList();
  const { data: usersPage } = useUsersList({ pageSize: 100, sortBy: "firstName", sortOrder: "asc" });
  const currentUser = useAuthStore((s) => s.user);
  // Carries the brand you were viewing on the Leads list (e.g. the Gifttai sidebar section
  // links to "/leads?brand=GIFTTAI") through to this form's default, and back again on
  // Cancel/Save so you land on the same filtered list you came from.
  const brandParam = (searchParams.get("brand") ?? "") as LeadBrand | "";
  const backTo = brandParam ? `/leads?brand=${brandParam}` : "/leads";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateLeadInput>({
    resolver: zodResolver(createLeadSchema),
    defaultValues: { status: "NEW", ownerId: currentUser?.id, brand: brandParam || "SWISDEX" },
  });

  const onSubmit = handleSubmit((data) => {
    createLead.mutate(data, {
      onSuccess: () => {
        toast.success("Lead created");
        navigate(backTo, { replace: true });
      },
      onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to create lead"),
    });
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">New Lead</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Add a new lead to the pipeline.</p>
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
          <div className="grid grid-cols-2 gap-4">
            <Input label="Company" error={errors.company?.message} {...register("company")} />
            <Input label="Job title" error={errors.jobTitle?.message} {...register("jobTitle")} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select label="Status" error={errors.status?.message} {...register("status")}>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABEL[status]}
                </option>
              ))}
            </Select>
            <Select label="Brand" error={errors.brand?.message} {...register("brand")}>
              {BRAND_OPTIONS.map((b) => (
                <option key={b} value={b}>
                  {BRAND_LABEL[b]}
                </option>
              ))}
            </Select>
          </div>

          <Input
            label="Score"
            type="number"
            min={0}
            max={100}
            error={errors.score?.message}
            {...register("score", { setValueAs: (v) => (v === "" ? undefined : Number(v)) })}
          />

          <Input
            label="Estimated value"
            type="number"
            min={0}
            step="0.01"
            error={errors.value?.message}
            {...register("value", { setValueAs: (v) => (v === "" ? undefined : Number(v)) })}
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Source"
              error={errors.sourceId?.message}
              {...register("sourceId", { setValueAs: (v) => v || undefined })}
            >
              <option value="">No source</option>
              {sources?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
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
            <Button type="button" variant="ghost" onClick={() => navigate(backTo)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createLead.isPending}>
              Create lead
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
