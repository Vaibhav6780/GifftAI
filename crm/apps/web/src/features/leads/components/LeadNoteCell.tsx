import { useState } from "react";
import { useAddLeadNote, useLeadNotes } from "../api";
import { useIsAssignedOrPrivileged } from "../../../hooks/usePermission";
import { LeadFirstNoteForm } from "./LeadFirstNoteForm";
import { Input } from "../../../components/ui/Input";
import { Button } from "../../../components/ui/Button";
import { Modal } from "../../../components/ui/Modal";
import { toast } from "../../../components/ui/Toast";

export function LeadNoteCell({ leadId, ownerId }: { leadId: string; ownerId: string | null }) {
  const { data: notes, isLoading } = useLeadNotes(leadId);
  const canManage = useIsAssignedOrPrivileged(ownerId);
  const addNote = useAddLeadNote(leadId);
  const [draft, setDraft] = useState("");
  const [showAll, setShowAll] = useState(false);
  const latest = notes?.[0];
  const isFirstNote = !isLoading && !notes?.length;

  function handleAdd() {
    if (!draft.trim()) return;
    addNote.mutate(
      { body: draft.trim() },
      {
        onSuccess: () => setDraft(""),
        onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to add note"),
      },
    );
  }

  if (canManage && isFirstNote) {
    return (
      <div className="min-w-56">
        <LeadFirstNoteForm leadId={leadId} compact />
      </div>
    );
  }

  return (
    <div className="flex min-w-56 flex-col gap-1">
      {latest && (
        <p className="truncate text-xs text-slate-500 dark:text-slate-400" title={latest.body}>
          {latest.body}
        </p>
      )}
      {notes && notes.length > 1 && (
        <button
          type="button"
          className="self-start text-xs text-brand-600 hover:underline dark:text-brand-500"
          onClick={() => setShowAll(true)}
        >
          Show all notes ({notes.length})
        </button>
      )}
      {canManage && (
        <div className="flex gap-1">
          <Input
            className="h-8 text-xs"
            placeholder="Add a note…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAdd();
              }
            }}
          />
          <Button size="sm" variant="secondary" onClick={handleAdd} isLoading={addNote.isPending} disabled={!draft.trim()}>
            Add
          </Button>
        </div>
      )}
      {!latest && !canManage && <span className="text-xs text-slate-400 dark:text-slate-500">—</span>}

      <Modal open={showAll} onClose={() => setShowAll(false)} title="All notes" className="max-w-lg">
        <ul className="flex max-h-96 flex-col gap-3 overflow-y-auto">
          {notes?.map((note) => (
            <li key={note.id} className="flex flex-col gap-1 border-b border-slate-100 pb-3 last:border-0 last:pb-0 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{note.userName}</span>
                <span className="text-xs text-slate-400 dark:text-slate-500">{new Date(note.createdAt).toLocaleString()}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{note.body}</p>
            </li>
          ))}
        </ul>
      </Modal>
    </div>
  );
}
