import { useState } from "react";
import type { LeadActivityEntry } from "@gifftai/shared";
import { useLeadActivity } from "../api";
import { Modal } from "../../../components/ui/Modal";
import { Spinner } from "../../../components/ui/Spinner";
import { Badge } from "../../../components/ui/Badge";

const KIND_BADGE: Record<LeadActivityEntry["kind"], { label: string; variant: "info" | "neutral" | "success" | "warning" }> = {
  status_change: { label: "Status change", variant: "info" },
  name_change: { label: "Name change", variant: "neutral" },
  followup_change: { label: "Follow-up", variant: "success" },
  note: { label: "Note", variant: "warning" },
};

function entryLabel(entry: LeadActivityEntry): string {
  const who = entry.userName ?? "Someone";
  switch (entry.kind) {
    case "status_change":
      return `${who} changed status: ${entry.fromStatus ?? "—"} → ${entry.toStatus ?? "—"}`;
    case "name_change":
    case "followup_change":
      return `${who} ${entry.body ?? ""}`;
    case "note":
      return `${who} added a note`;
  }
}

/** "Report" column on the Leads list — a blue link that opens a modal with the lead's
 *  merged status-change + note history (who did what, when), so that context is reachable
 *  without leaving the list to open the full lead detail page. */
export function LeadActivityModal({ leadId, leadLabel }: { leadId: string; leadLabel: string }) {
  const [open, setOpen] = useState(false);
  const { data: entries, isLoading } = useLeadActivity(open ? leadId : undefined);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-500"
      >
        Report
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={`Activity — ${leadLabel}`} className="max-w-lg">
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        ) : !entries?.length ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No activity yet.</p>
        ) : (
          <ul className="flex max-h-96 flex-col gap-3 overflow-y-auto">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-col gap-1 border-b border-slate-100 pb-3 last:border-0 last:pb-0 dark:border-slate-800"
              >
                <div className="flex items-center gap-2">
                  <Badge variant={KIND_BADGE[entry.kind].variant}>{KIND_BADGE[entry.kind].label}</Badge>
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {new Date(entry.occurredAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-200">{entryLabel(entry)}</p>
                {entry.kind === "note" && entry.body && (
                  <p className="text-sm text-slate-700 dark:text-slate-200">{entry.body}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </>
  );
}
