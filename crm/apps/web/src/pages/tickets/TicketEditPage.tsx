import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useParams } from "react-router-dom";
import { updateTicketSchema, type UpdateTicketInput } from "@gifftai/shared";
import { useAssignTicket, useDeleteTicket, useTicket, useUpdateTicket } from "../../features/tickets/api";
import { TicketAttachments } from "../../features/tickets/components/TicketAttachments";
import { PRIORITY_OPTIONS, PRIORITY_VARIANT, STATUS_OPTIONS, STATUS_VARIANT } from "../../features/tickets/constants";
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

export function TicketEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const canDelete = useHasPermission("tickets:delete");

  const { data: ticket, isLoading, isError, refetch } = useTicket(id);
  const { data: usersPage } = useUsersList({ pageSize: 100, sortBy: "firstName", sortOrder: "asc" });

  const updateTicket = useUpdateTicket(id!);
  const assignTicket = useAssignTicket(id!);
  const deleteTicket = useDeleteTicket();

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateTicketInput>({ resolver: zodResolver(updateTicketSchema) });

  useEffect(() => {
    if (!ticket) return;
    reset({
      subject: ticket.subject,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      requesterEmail: ticket.requesterEmail,
    });
  }, [ticket, reset]);

  if (isLoading) return <PageSpinner />;
  if (isError || !ticket) return <ErrorState description="Couldn't load this ticket." onRetry={() => refetch()} />;

  const onSubmit = handleSubmit((data) => {
    updateTicket.mutate(data, {
      onSuccess: () => toast.success("Ticket updated"),
      onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to update ticket"),
    });
  });

  function handleAssign(assignedToId: string) {
    assignTicket.mutate(
      { assignedToId: assignedToId || null },
      {
        onSuccess: () => toast.success(assignedToId ? "Ticket assigned" : "Ticket unassigned"),
        onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to assign ticket"),
      },
    );
  }

  function handleDelete() {
    deleteTicket.mutate(id!, {
      onSuccess: () => {
        toast.success("Ticket deleted");
        navigate("/tickets");
      },
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : "Failed to delete ticket");
        setConfirmDeleteOpen(false);
      },
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{ticket.subject}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{ticket.requesterEmail ?? "No requester email"}</p>
        </div>
        <Badge variant={STATUS_VARIANT[ticket.status]}>{ticket.status}</Badge>
        <Badge variant={PRIORITY_VARIANT[ticket.priority]}>{ticket.priority}</Badge>
      </div>

      <Card className="max-w-2xl p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Assignment</h2>
        <Select
          label="Assigned to"
          value={ticket.assignedToId ?? ""}
          onChange={(e) => handleAssign(e.target.value)}
        >
          <option value="">Unassigned</option>
          {usersPage?.items.map((u) => (
            <option key={u.id} value={u.id}>
              {u.firstName} {u.lastName}
            </option>
          ))}
        </Select>
      </Card>

      <Card className="max-w-2xl p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Details</h2>
        <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
          <Input label="Subject" error={errors.subject?.message} {...register("subject")} />

          <div className="grid grid-cols-2 gap-4">
            <Select label="Status" error={errors.status?.message} {...register("status")}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
            <Select label="Priority" error={errors.priority?.message} {...register("priority")}>
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </div>

          <Input label="Requester email" error={errors.requesterEmail?.message} {...register("requesterEmail")} />

          <Textarea label="Description" rows={4} error={errors.description?.message} {...register("description")} />

          <div className="flex justify-end">
            <Button type="submit" isLoading={updateTicket.isPending}>
              Save details
            </Button>
          </div>
        </form>
      </Card>

      <TicketAttachments ticketId={id!} />

      {canDelete && (
        <Card className="max-w-2xl p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Danger zone</h2>
          <Button variant="danger" onClick={() => setConfirmDeleteOpen(true)}>
            Delete ticket
          </Button>
        </Card>
      )}

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Delete ticket"
        description={`Are you sure you want to delete "${ticket.subject}"? This cannot be undone.`}
        confirmLabel="Delete"
        isLoading={deleteTicket.isPending}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </div>
  );
}
