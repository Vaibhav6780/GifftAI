import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import clsx from "clsx";
import type { WhatsappInboxConversation } from "@gifftai/shared";
import { useIntegrationsList, useSendWhatsappReply, useWhatsappInbox } from "../../features/integrations/api";
import { useLeadTimeline } from "../../features/leads/api";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Textarea } from "../../components/ui/Textarea";
import { PageSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { toast } from "../../components/ui/Toast";
import { useHasPermission } from "../../hooks/usePermission";

const DELIVERY_STATUS_LABEL: Record<string, string> = {
  SENT: "Sent",
  DELIVERED: "Delivered",
  READ: "Read",
  FAILED: "Failed",
};

export function WhatsappInboxPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedLeadId = searchParams.get("leadId");
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, refetch } = useWhatsappInbox({
    page: 1,
    pageSize: 50,
    search: search || undefined,
  });
  const conversations = data?.items ?? [];
  const selectedConversation = conversations.find((c) => c.leadId === selectedLeadId) ?? null;

  function selectLead(leadId: string) {
    const next = new URLSearchParams(searchParams);
    next.set("leadId", leadId);
    setSearchParams(next);
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">WhatsApp Inbox</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Every WhatsApp conversation, in one place.</p>
      </div>

      <div className="flex min-h-0 flex-1 gap-4">
        <Card className="flex w-80 shrink-0 flex-col overflow-hidden p-0">
          <div className="border-b border-slate-200 p-3 dark:border-slate-800">
            <Input placeholder="Search leads or phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <PageSpinner />
            ) : isError ? (
              <div className="p-4">
                <ErrorState onRetry={() => refetch()} />
              </div>
            ) : conversations.length === 0 ? (
              <EmptyState icon={MessageCircle} title="No WhatsApp conversations yet" />
            ) : (
              <ul>
                {conversations.map((conversation) => (
                  <li key={conversation.id}>
                    <button
                      type="button"
                      onClick={() => selectLead(conversation.leadId)}
                      className={clsx(
                        "flex w-full flex-col gap-0.5 border-b border-slate-100 px-3 py-2.5 text-left dark:border-slate-800",
                        conversation.leadId === selectedLeadId
                          ? "bg-brand-50 dark:bg-brand-500/10"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                          {conversation.leadName || conversation.phone || "Unknown"}
                        </span>
                        {conversation.unreadCount > 0 && <Badge variant="info">{conversation.unreadCount}</Badge>}
                      </div>
                      <span className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {conversation.lastMessageBody ?? "No messages yet"}
                      </span>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">
                        {conversation.lastMessageAt ? new Date(conversation.lastMessageAt).toLocaleString() : ""}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card className="flex min-h-0 flex-1 flex-col p-0">
          {selectedConversation ? (
            <WhatsappThreadPanel conversation={selectedConversation} />
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <EmptyState
                icon={MessageCircle}
                title="Select a conversation"
                description="Pick a lead on the left to view its WhatsApp history."
              />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function WhatsappThreadPanel({ conversation }: { conversation: WhatsappInboxConversation }) {
  const { data: entries, isLoading } = useLeadTimeline(conversation.leadId);
  const { data: integrations } = useIntegrationsList();
  const sendReply = useSendWhatsappReply(conversation.leadId);
  const canUpdate = useHasPermission("leads:update");
  const [replyBody, setReplyBody] = useState("");

  const whatsappConnected = integrations?.some((i) => i.channelType === "WHATSAPP" && i.status === "CONNECTED");
  const canReply = canUpdate && whatsappConnected && Boolean(conversation.phone);

  // Timeline entries are newest-first; a chat thread reads top-to-bottom oldest-first.
  const messages = (entries ?? []).filter((entry) => entry.kind === "message").slice().reverse();

  function handleSend() {
    if (!replyBody.trim()) return;
    sendReply.mutate(replyBody.trim(), {
      onSuccess: () => {
        toast.success("Message sent");
        setReplyBody("");
      },
      onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to send message"),
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-slate-200 p-4 dark:border-slate-800">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100">{conversation.leadName || "Unknown lead"}</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">{conversation.phone ?? "No phone number"}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <PageSpinner />
        ) : messages.length === 0 ? (
          <EmptyState icon={MessageCircle} title="No messages yet" />
        ) : (
          <ul className="flex flex-col gap-3">
            {messages.map((entry) => {
              const senderType = (entry.metadata?.senderType as string | undefined) ?? entry.label;
              const isOutbound = senderType === "AGENT";
              const deliveryStatus = entry.metadata?.deliveryStatus as string | null | undefined;
              return (
                <li key={entry.id} className={clsx("flex", isOutbound ? "justify-end" : "justify-start")}>
                  <div
                    className={clsx(
                      "max-w-[75%] rounded-lg px-3 py-2 text-sm",
                      isOutbound
                        ? "bg-brand-600 text-white"
                        : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100",
                    )}
                  >
                    <p className="whitespace-pre-wrap">{entry.body}</p>
                    <div
                      className={clsx(
                        "mt-1 flex items-center gap-1 text-[11px]",
                        isOutbound ? "text-brand-100" : "text-slate-400 dark:text-slate-500",
                      )}
                    >
                      <span>{new Date(entry.occurredAt).toLocaleString()}</span>
                      {isOutbound && deliveryStatus && <span>· {DELIVERY_STATUS_LABEL[deliveryStatus] ?? deliveryStatus}</span>}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {canReply && (
        <div className="flex flex-col gap-2 border-t border-slate-200 p-3 dark:border-slate-800">
          <Textarea
            placeholder="Message this lead on WhatsApp…"
            rows={2}
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={handleSend} isLoading={sendReply.isPending} disabled={!replyBody.trim()}>
              Send
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
