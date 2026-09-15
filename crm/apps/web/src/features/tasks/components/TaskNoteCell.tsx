import { useState } from "react";
import { useAddTaskComment, useTaskActivity } from "../api";
import { useIsAssignedOrPrivileged } from "../../../hooks/usePermission";
import { Input } from "../../../components/ui/Input";
import { Button } from "../../../components/ui/Button";
import { toast } from "../../../components/ui/Toast";

export function TaskNoteCell({ taskId, assignedToId }: { taskId: string; assignedToId: string | null }) {
  const { data: activity } = useTaskActivity(taskId);
  const canManage = useIsAssignedOrPrivileged(assignedToId);
  const addComment = useAddTaskComment(taskId);
  const [draft, setDraft] = useState("");
  const latest = activity?.filter((entry) => entry.kind === "comment")[0];

  function handleAdd() {
    if (!draft.trim()) return;
    addComment.mutate(
      { body: draft.trim() },
      {
        onSuccess: () => setDraft(""),
        onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to add note"),
      },
    );
  }

  return (
    <div className="flex min-w-56 flex-col gap-1">
      {latest && (
        <p className="truncate text-xs text-slate-500 dark:text-slate-400" title={latest.body ?? ""}>
          {latest.body}
        </p>
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
          <Button size="sm" variant="secondary" onClick={handleAdd} isLoading={addComment.isPending} disabled={!draft.trim()}>
            Add
          </Button>
        </div>
      )}
      {!latest && !canManage && <span className="text-xs text-slate-400 dark:text-slate-500">—</span>}
    </div>
  );
}
