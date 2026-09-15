import { useState } from "react";
import type { TaskActivityEntry } from "@gifftai/shared";
import { useAddTaskComment, useTaskActivity } from "../api";
import { Card } from "../../../components/ui/Card";
import { Spinner } from "../../../components/ui/Spinner";
import { Badge } from "../../../components/ui/Badge";
import { Textarea } from "../../../components/ui/Textarea";
import { Button } from "../../../components/ui/Button";
import { toast } from "../../../components/ui/Toast";

function entryLabel(entry: TaskActivityEntry): string {
  if (entry.kind === "status_change") {
    return `${entry.userName ?? "Someone"} changed status: ${entry.fromStatus ?? "—"} → ${entry.toStatus ?? "—"}`;
  }
  return entry.userName ?? "Someone";
}

export function TaskActivityLog({ taskId, canComment }: { taskId: string; canComment: boolean }) {
  const { data: entries, isLoading } = useTaskActivity(taskId);
  const addComment = useAddTaskComment(taskId);
  const [commentBody, setCommentBody] = useState("");

  function handleAddComment() {
    if (!commentBody.trim()) return;
    addComment.mutate(
      { body: commentBody.trim() },
      {
        onSuccess: () => {
          toast.success("Progress note added");
          setCommentBody("");
        },
        onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to add progress note"),
      },
    );
  }

  return (
    <Card className="max-w-2xl p-6">
      <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Progress Notes &amp; History</h2>

      {canComment ? (
        <div className="mb-4 flex flex-col gap-2">
          <Textarea
            placeholder="Log a progress update on this task…"
            rows={3}
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={handleAddComment}
              isLoading={addComment.isPending}
              disabled={!commentBody.trim()}
            >
              Add note
            </Button>
          </div>
        </div>
      ) : (
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          Only the assigned user or an admin can update status or add progress notes.
        </p>
      )}

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Spinner />
        </div>
      ) : !entries?.length ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">No activity yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex flex-col gap-1 border-b border-slate-100 pb-3 last:border-0 last:pb-0 dark:border-slate-800"
            >
              <div className="flex items-center gap-2">
                <Badge variant={entry.kind === "status_change" ? "info" : "warning"}>
                  {entry.kind === "status_change" ? "Status change" : "Progress note"}
                </Badge>
                <span className="text-xs text-slate-400 dark:text-slate-500">{new Date(entry.occurredAt).toLocaleString()}</span>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-200">{entryLabel(entry)}</p>
              {entry.kind === "comment" && entry.body && (
                <p className="text-sm text-slate-700 dark:text-slate-200">{entry.body}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
