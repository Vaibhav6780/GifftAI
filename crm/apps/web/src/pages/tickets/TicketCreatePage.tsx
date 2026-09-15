import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { createTicketSchema, type CreateTicketInput } from "@gifftai/shared";
import { useCreateTicket } from "../../features/tickets/api";
import { PRIORITY_OPTIONS, STATUS_OPTIONS } from "../../features/tickets/constants";
import { useUsersList } from "../../features/users/api";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Textarea } from "../../components/ui/Textarea";
import { Button } from "../../components/ui/Button";
import { toast } from "../../components/ui/Toast";

export function TicketCreatePage() {
  const navigate = useNavigate();
  const createTicket = useCreateTicket();
  const { data: usersPage } = useUsersList({ pageSize: 100, sortBy: "firstName", sortOrder: "asc" });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateTicketInput>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: { status: "OPEN", priority: "MEDIUM" },
  });

  const onSubmit = handleSubmit((data) => {
    createTicket.mutate(data, {
      onSuccess: (ticket) => {
        toast.success("Ticket created");
        navigate(`/tickets/${ticket.id}`, { replace: true });
      },
      onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to create ticket"),
    });
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">New Ticket</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Raise a new support ticket.</p>
      </div>

      <Card className="max-w-2xl p-6">
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

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Requester email"
              error={errors.requesterEmail?.message}
              {...register("requesterEmail")}
            />
            <Select
              label="Assigned to"
              error={errors.assignedToId?.message}
              {...register("assignedToId", { setValueAs: (v) => v || undefined })}
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
            <Button type="button" variant="ghost" onClick={() => navigate("/tickets")}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createTicket.isPending}>
              Create ticket
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
