import { useState } from "react";
import { useUpdateLead } from "../api";
import { useIsAssignedOrPrivileged } from "../../../hooks/usePermission";
import { Input } from "../../../components/ui/Input";
import { Button } from "../../../components/ui/Button";
import { toast } from "../../../components/ui/Toast";

function toDateInputValue(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

/** "8/24/2026 at 3:30 PM" when a time was given, else just the date -- shared by the
 *  read-only and manageable display branches below. */
function formatFollowupLabel(followupDate: string, followupTime: string | null): string {
  const dateLabel = new Date(followupDate).toLocaleDateString();
  if (!followupTime) return dateLabel;
  const [hours, minutes] = followupTime.split(":").map(Number);
  const timeLabel = new Date(2000, 0, 1, hours, minutes).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${dateLabel} at ${timeLabel}`;
}

export function LeadFollowupCell({
  leadId,
  ownerId,
  needsFollowup,
  followupDate,
  followupTime,
}: {
  leadId: string;
  ownerId: string | null;
  needsFollowup: boolean;
  followupDate: string | null;
  followupTime: string | null;
}) {
  const canManage = useIsAssignedOrPrivileged(ownerId);
  const updateLead = useUpdateLead(leadId);
  const [pickingDate, setPickingDate] = useState(false);
  const [dateDraft, setDateDraft] = useState(toDateInputValue(followupDate));
  const [timeDraft, setTimeDraft] = useState(followupTime ?? "");

  function handleUncheck() {
    updateLead.mutate(
      { needsFollowup: false, followupDate: null, followupTime: null },
      { onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to update follow-up") },
    );
  }

  function handleConfirmDate() {
    if (!dateDraft) return;
    updateLead.mutate(
      {
        needsFollowup: true,
        followupDate: new Date(`${dateDraft}T00:00:00.000Z`).toISOString(),
        followupTime: timeDraft || null,
      },
      {
        onSuccess: () => {
          toast.success("Follow-up scheduled");
          setPickingDate(false);
        },
        onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to update follow-up"),
      },
    );
  }

  if (!canManage) {
    return needsFollowup ? (
      <span className="text-xs text-slate-600 dark:text-slate-300">
        {followupDate ? formatFollowupLabel(followupDate, followupTime) : "Yes"}
      </span>
    ) : (
      <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
    );
  }

  if (pickingDate) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1">
          <Input
            type="date"
            aria-label="Follow-up date"
            className="h-8 w-36 text-xs"
            value={dateDraft}
            onChange={(e) => setDateDraft(e.target.value)}
          />
          <Input
            type="time"
            aria-label="Follow-up time (optional)"
            className="h-8 w-28 text-xs"
            value={timeDraft}
            onChange={(e) => setTimeDraft(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-slate-400 dark:text-slate-500">Time is optional</span>
          <div className="ml-auto flex items-center gap-1">
            <Button size="sm" onClick={handleConfirmDate} isLoading={updateLead.isPending} disabled={!dateDraft}>
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setPickingDate(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200">
      <input
        type="checkbox"
        className="size-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-600"
        checked={needsFollowup}
        disabled={updateLead.isPending}
        onChange={(e) => (e.target.checked ? setPickingDate(true) : handleUncheck())}
      />
      {needsFollowup && followupDate ? formatFollowupLabel(followupDate, followupTime) : "Needs follow-up?"}
    </label>
  );
}
