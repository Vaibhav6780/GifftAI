import { useState } from "react";
import type { LeadNote } from "@gifftai/shared";
import { useAddLeadNote, useLeadNotes, useUpdateLeadNote } from "../api";
import { useIsAssignedOrPrivileged } from "../../../hooks/usePermission";
import { LeadFirstNoteForm } from "./LeadFirstNoteForm";
import { Card } from "../../../components/ui/Card";
import { Spinner } from "../../../components/ui/Spinner";
import { Textarea } from "../../../components/ui/Textarea";
import { Button } from "../../../components/ui/Button";
import { toast } from "../../../components/ui/Toast";

function NoteRow({ note, canManage, onSave }: { note: LeadNote; canManage: boolean; onSave: (noteId: string, body: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(note.body);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!body.trim()) return;
    setSaving(true);
    try {
      await onSave(note.id, body.trim());
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="flex flex-col gap-1 border-b border-slate-100 pb-3 last:border-0 last:pb-0 dark:border-slate-800">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{note.userName}</span>
          <span className="text-xs text-slate-400 dark:text-slate-500">{new Date(note.createdAt).toLocaleString()}</span>
        </div>
        {canManage && !editing && (
          <button
            type="button"
            className="text-xs text-brand-600 hover:underline dark:text-brand-500"
            onClick={() => {
              setBody(note.body);
              setEditing(true);
            }}
          >
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <div className="flex flex-col gap-2">
          <Textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => setEditing(false)} disabled={saving}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} isLoading={saving} disabled={!body.trim()}>
              Save
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-700 dark:text-slate-200">{note.body}</p>
      )}
    </li>
  );
}

export function LeadNotes({ leadId, leadOwnerId }: { leadId: string; leadOwnerId: string | null }) {
  const { data: notes, isLoading } = useLeadNotes(leadId);
  const canManage = useIsAssignedOrPrivileged(leadOwnerId);
  const addNote = useAddLeadNote(leadId);
  const updateNote = useUpdateLeadNote(leadId);
  const [noteBody, setNoteBody] = useState("");

  const isFirstNote = !isLoading && !notes?.length;

  function handleAddNote() {
    if (!noteBody.trim()) return;
    addNote.mutate(
      { body: noteBody.trim() },
      {
        onSuccess: () => {
          toast.success("Note added");
          setNoteBody("");
        },
        onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to add note"),
      },
    );
  }

  async function handleSaveNote(noteId: string, body: string) {
    try {
      await updateNote.mutateAsync({ noteId, input: { body } });
      toast.success("Note updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update note");
      throw error;
    }
  }

  return (
    <Card className="max-w-2xl p-6">
      <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Notes</h2>

      {canManage && isFirstNote ? (
        <LeadFirstNoteForm leadId={leadId} />
      ) : canManage ? (
        <div className="mb-4 flex flex-col gap-2">
          <Textarea
            placeholder="Add a note about this lead…"
            rows={3}
            value={noteBody}
            onChange={(e) => setNoteBody(e.target.value)}
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={handleAddNote} isLoading={addNote.isPending} disabled={!noteBody.trim()}>
              Add note
            </Button>
          </div>
        </div>
      ) : (
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          Only the assigned owner or an admin can add or edit notes.
        </p>
      )}

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Spinner />
        </div>
      ) : !notes?.length ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">No notes yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {notes.map((note) => (
            <NoteRow key={note.id} note={note} canManage={canManage} onSave={handleSaveNote} />
          ))}
        </ul>
      )}
    </Card>
  );
}
