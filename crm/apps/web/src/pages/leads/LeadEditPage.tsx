import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate, useParams } from "react-router-dom";
import { updateLeadSchema, type UpdateLeadInput } from "@gifftai/shared";
import { useAssignLead, useConvertLead, useDeleteLead, useLead, useUpdateLead } from "../../features/leads/api";
import { STATUS_LABEL, STATUS_OPTIONS, STATUS_VARIANT } from "../../features/leads/constants";
import { useLeadSourcesList } from "../../features/lead-sources/api";
import { useUsersList } from "../../features/users/api";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Textarea } from "../../components/ui/Textarea";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { PageSpinner } from "../../components/ui/Spinner";
import { ErrorState } from "../../components/ui/ErrorState";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { toast } from "../../components/ui/Toast";
import { useHasPermission } from "../../hooks/usePermission";
import { LeadSourceBadge } from "../../features/leads/components/LeadSourceBadge";
import { LeadConversationTimeline } from "../../features/leads/components/LeadConversationTimeline";
import { LeadNotes } from "../../features/leads/components/LeadNotes";

export function LeadEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const canAssign = useHasPermission("leads:assign");
  const canDelete = useHasPermission("leads:delete");
  const canConvert = useHasPermission("leads:update");

  const { data: lead, isLoading, isError, refetch } = useLead(id);
  const { data: sources } = useLeadSourcesList();
  const { data: usersPage } = useUsersList({ pageSize: 100, sortBy: "firstName", sortOrder: "asc" });

  const updateLead = useUpdateLead(id!);
  const assignLead = useAssignLead(id!);
  const deleteLead = useDeleteLead();
  const convertLead = useConvertLead(id!);

  const [selectedOwnerId, setSelectedOwnerId] = useState("");
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateLeadInput>({ resolver: zodResolver(updateLeadSchema) });

  useEffect(() => {
    if (!lead) return;
    reset({
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      jobTitle: lead.jobTitle,
      status: lead.status,
      score: lead.score,
      value: lead.value,
      description: lead.description,
      sourceId: lead.sourceId,
    });
    setSelectedOwnerId(lead.ownerId ?? "");
  }, [lead, reset]);

  if (isLoading) return <PageSpinner />;
  if (isError || !lead) return <ErrorState description="Couldn't load this lead." onRetry={() => refetch()} />;

  const onSubmit = handleSubmit((data) => {
    updateLead.mutate(data, {
      onSuccess: () => toast.success("Lead updated"),
      onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to update lead"),
    });
  });

  function handleReassign() {
    assignLead.mutate(
      { ownerId: selectedOwnerId || null },
      {
        onSuccess: () => toast.success("Owner updated"),
        onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to reassign lead"),
      },
    );
  }

  function handleConvert() {
    convertLead.mutate(undefined, {
      onSuccess: (updated) => {
        toast.success("Lead converted to contact");
        if (updated.convertedContactId) navigate(`/contacts/${updated.convertedContactId}`);
      },
      onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to convert lead"),
    });
  }

  function handleDelete() {
    deleteLead.mutate(id!, {
      onSuccess: () => {
        toast.success("Lead deleted");
        navigate("/leads");
      },
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : "Failed to delete lead");
        setConfirmDeleteOpen(false);
      },
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {lead.firstName} {lead.lastName}
          </h1>
          {lead.company && <p className="text-sm text-slate-500 dark:text-slate-400">{lead.company}</p>}
        </div>
        <div className="flex items-center gap-2">
          <LeadSourceBadge sourceName={lead.sourceName} />
          <Badge variant={STATUS_VARIANT[lead.status]}>{STATUS_LABEL[lead.status]}</Badge>
          {lead.convertedContactId ? (
            <Link to={`/contacts/${lead.convertedContactId}`} className="text-sm text-brand-600 hover:underline dark:text-brand-500">
              View contact →
            </Link>
          ) : (
            canConvert && (
              <Button size="sm" variant="secondary" onClick={handleConvert} isLoading={convertLead.isPending}>
                Convert to Contact
              </Button>
            )
          )}
        </div>
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
            <Input
              label="Score"
              type="number"
              min={0}
              max={100}
              error={errors.score?.message}
              {...register("score", { setValueAs: (v) => (v === "" ? undefined : Number(v)) })}
            />
          </div>

          <Input
            label="Estimated value"
            type="number"
            min={0}
            step="0.01"
            error={errors.value?.message}
            {...register("value", { setValueAs: (v) => (v === "" ? undefined : Number(v)) })}
          />

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

          <Textarea label="Description" rows={4} error={errors.description?.message} {...register("description")} />

          <div className="flex justify-end">
            <Button type="submit" isLoading={updateLead.isPending}>
              Save details
            </Button>
          </div>
        </form>
      </Card>

      <Card className="max-w-2xl p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Owner</h2>
        <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
          Currently owned by <span className="font-medium text-slate-700 dark:text-slate-200">{lead.ownerName ?? "no one"}</span>.
        </p>
        {canAssign ? (
          <div className="flex flex-wrap items-end gap-3">
            <Select
              label="Reassign to"
              className="w-56"
              value={selectedOwnerId}
              onChange={(e) => setSelectedOwnerId(e.target.value)}
            >
              <option value="">Unassigned</option>
              {usersPage?.items.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName}
                </option>
              ))}
            </Select>
            <Button onClick={handleReassign} isLoading={assignLead.isPending}>
              Reassign
            </Button>
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">You don't have permission to reassign leads.</p>
        )}
      </Card>

      <LeadNotes leadId={id!} leadOwnerId={lead.ownerId} />

      <LeadConversationTimeline leadId={id!} leadPhone={lead?.phone ?? null} />

      {canDelete && (
        <Card className="max-w-2xl p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Danger zone</h2>
          <Button variant="danger" onClick={() => setConfirmDeleteOpen(true)}>
            Delete lead
          </Button>
        </Card>
      )}

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Delete lead"
        description={`Are you sure you want to delete "${lead.firstName} ${lead.lastName}"? This cannot be undone.`}
        confirmLabel="Delete"
        isLoading={deleteLead.isPending}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </div>
  );
}
