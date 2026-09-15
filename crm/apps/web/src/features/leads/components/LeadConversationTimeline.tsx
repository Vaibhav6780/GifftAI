import { useState } from "react";
import type { LeadTimelineEntry } from "@gifftai/shared";
import { useLeadTimeline } from "../api";
import { useIntegrationsList, useSendWhatsappReply, useSyncLeadWhatsapp } from "../../integrations/api";
import { Card } from "../../../components/ui/Card";
import { Spinner } from "../../../components/ui/Spinner";
import { Badge } from "../../../components/ui/Badge";
import { Textarea } from "../../../components/ui/Textarea";
import { Button } from "../../../components/ui/Button";
import { toast } from "../../../components/ui/Toast";
import { useHasPermission } from "../../../hooks/usePermission";

const KIND_VARIANT: Record<LeadTimelineEntry["kind"], "info" | "success" | "neutral"> = {
  activity: "info",
  message: "success",
  attachment: "neutral",
};

export function LeadConversationTimeline({ leadId, leadPhone }: { leadId: string; leadPhone: string | null }) {
  const { data: entries, isLoading } = useLeadTimeline(leadId);
  const { data: integrations } = useIntegrationsList();
  const sendReply = useSendWhatsappReply(leadId);
  const syncWhatsapp = useSyncLeadWhatsapp(leadId);
  const canUpdate = useHasPermission("leads:update");
  const [replyBody, setReplyBody] = useState("");

  const whatsappConnected = integrations?.some((i) => i.channelType === "WHATSAPP" && i.status === "CONNECTED");
  const canReplyOnWhatsapp = canUpdate && whatsappConnected && Boolean(leadPhone);

  function handleSendReply() {
    if (!replyBody.trim()) return;
    sendReply.mutate(replyBody.trim(), {
      onSuccess: () => {
        toast.success("Message sent");
        setReplyBody("");
      },
      onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to send message"),
    });
  }

  function handleSyncWhatsapp() {
    syncWhatsapp.mutate(undefined, {
      onSuccess: (result) => toast.success(`Synced ${result.synced} message${result.synced === 1 ? "" : "s"}`),
      onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to sync WhatsApp history"),
    });
  }

  return (
    <Card className="max-w-2xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Activity</h2>
        {whatsappConnected && leadPhone && (
          <Button size="sm" variant="secondary" onClick={handleSyncWhatsapp} isLoading={syncWhatsapp.isPending}>
            Sync WhatsApp history
          </Button>
        )}
      </div>

      {canReplyOnWhatsapp && (
        <div className="mb-4 flex flex-col gap-2 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Send a WhatsApp message</span>
          <Textarea
            placeholder="Message this lead on WhatsApp…"
            rows={2}
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="secondary"
              onClick={handleSendReply}
              isLoading={sendReply.isPending}
              disabled={!replyBody.trim()}
            >
              Send
            </Button>
          </div>
        </div>
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
                <Badge variant={KIND_VARIANT[entry.kind]}>{entry.label}</Badge>
                <span className="text-xs text-slate-400 dark:text-slate-500">{new Date(entry.occurredAt).toLocaleString()}</span>
              </div>
              {entry.body && <p className="text-sm text-slate-700 dark:text-slate-200">{entry.body}</p>}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
