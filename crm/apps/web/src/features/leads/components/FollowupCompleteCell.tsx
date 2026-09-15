import { useState } from "react";
import { useAddLeadNote, useUpdateLead } from "../api";
import { useIsAssignedOrPrivileged } from "../../../hooks/usePermission";
import { Button } from "../../../components/ui/Button";
import { Modal } from "../../../components/ui/Modal";
import { Textarea } from "../../../components/ui/Textarea";
import { toast } from "../../../components/ui/Toast";

/** "Complete" column on Follow-ups Due -- clears the lead's follow-up (optionally logging a
 *  quick note on what happened first). Completion is persisted server-side (LeadFollowup
 *  history row, see leadsRepository.recordFollowupHistory), so `completedAt` here is real
 *  server truth, not client-only state -- Undo/Complete both just mutate the lead and let the
 *  list query (shares the "leads" cache prefix useUpdateLead already invalidates) refetch. */
export function FollowupCompleteCell({
  leadId,
  ownerId,
  dueDate,
  dueTime,
  completedAt,
}: {
  leadId: string;
  ownerId: string | null;
  dueDate: string;
  dueTime: string | null;
  completedAt: string | null;
}) {
  const canManage = useIsAssignedOrPrivileged(ownerId);
  const updateLead = useUpdateLead(leadId);
  const addNote = useAddLeadNote(leadId);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");

  function handleConfirm() {
    const body = note.trim();
    const finish = () => {
      updateLead.mutate(
        { needsFollowup: false },
        {
          onSuccess: () => {
            setOpen(false);
            setNote("");
          },
          onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to mark complete"),
        },
      );
    };

    if (!body) {
      finish();
      return;
    }
    addNote.mutate(
      { body },
      {
        onSuccess: finish,
        onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to add note"),
      },
    );
  }

  function handleUndo() {
    updateLead.mutate(
      { needsFollowup: true, followupDate: dueDate, followupTime: dueTime },
      {
        onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to undo"),
      },
    );
  }

  if (!canManage) return <span className="text-xs text-slate-400 dark:text-slate-500">—</span>;

  if (completedAt) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-green-600 dark:text-green-500">
          Completed {new Date(completedAt).toLocaleDateString()}
        </span>
        <button
          type="button"
          className="text-xs text-brand-600 hover:underline dark:text-brand-500"
          onClick={handleUndo}
          disabled={updateLead.isPending}
        >
          Undo
        </button>
      </div>
    );
  }

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        Mark complete
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Mark follow-up complete" className="max-w-md">
        <div className="flex flex-col gap-4">
          <Textarea
            label="Note (optional)"
            placeholder="What happened on this follow-up?"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={updateLead.isPending || addNote.isPending}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} isLoading={updateLead.isPending || addNote.isPending}>
              Mark complete
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
