import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Mail, PenSquare } from "lucide-react";
import clsx from "clsx";
import type { MailInboxConversation } from "@gifftai/shared";
import {
  useMailConversationMessages,
  useMailInbox,
  useMailSent,
  useMarkMailConversationRead,
  useSendMailReply,
} from "../../features/mail/api";
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
import { MailComposeModal } from "./MailComposeModal";

export function MailInboxPage() {
  const [tab, setTab] = useState<"inbox" | "sent">("inbox");
  const [composeOpen, setComposeOpen] = useState(false);
  const canSend = useHasPermission("mail:send");
  // Stable reference passed to MailComposeModal — an inline arrow function here would get a
  // new identity on every MailInboxPage re-render, which (combined with Modal's focus-trap
  // effect depending on the onClose it's given) risks the same mid-typing refocus bug fixed
  // in MailComposeModal itself.
  const closeCompose = useCallback(() => setComposeOpen(false), []);

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Mail</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">support@gifftai.com and its aliases, in one inbox.</p>
        </div>
        {canSend && (
          <Button onClick={() => setComposeOpen(true)}>
            <PenSquare className="mr-1.5 h-4 w-4" />
            Compose
          </Button>
        )}
      </div>

      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800">
        {(["inbox", "sent"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={clsx(
              "border-b-2 px-3 py-2 text-sm font-medium capitalize",
              tab === value
                ? "border-brand-600 text-brand-600 dark:text-brand-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
            )}
          >
            {value}
          </button>
        ))}
      </div>

      {tab === "inbox" ? <MailInboxTab /> : <MailSentTab />}

      <MailComposeModal open={composeOpen} onClose={closeCompose} />
    </div>
  );
}

function MailInboxTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get("conversationId");
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, refetch } = useMailInbox({ page: 1, pageSize: 50, search: search || undefined });
  const conversations = data?.items ?? [];
  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  function select(id: string) {
    const next = new URLSearchParams(searchParams);
    next.set("conversationId", id);
    setSearchParams(next);
  }

  return (
    <div className="flex min-h-0 flex-1 gap-4">
      <Card className="flex w-80 shrink-0 flex-col overflow-hidden p-0">
        <div className="border-b border-slate-200 p-3 dark:border-slate-800">
          <Input placeholder="Search subject, name, email…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <PageSpinner />
          ) : isError ? (
            <div className="p-4">
              <ErrorState onRetry={() => refetch()} />
            </div>
          ) : conversations.length === 0 ? (
            <EmptyState icon={Mail} title="No emails yet" />
          ) : (
            <ul>
              {conversations.map((conversation) => (
                <li key={conversation.id}>
                  <button
                    type="button"
                    onClick={() => select(conversation.id)}
                    className={clsx(
                      "flex w-full flex-col gap-0.5 border-b border-slate-100 px-3 py-2.5 text-left dark:border-slate-800",
                      conversation.id === selectedId ? "bg-brand-50 dark:bg-brand-500/10" : "hover:bg-slate-50 dark:hover:bg-slate-800",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                        {conversation.leadName || conversation.contactName || conversation.participantEmail || "Unknown"}
                      </span>
                      {conversation.unreadCount > 0 && <Badge variant="info">{conversation.unreadCount}</Badge>}
                    </div>
                    <span className="truncate text-xs font-medium text-slate-600 dark:text-slate-300">
                      {conversation.subject ?? "(no subject)"}
                    </span>
                    <span className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {conversation.lastMessageBody ?? "No messages yet"}
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">
                        {conversation.lastMessageAt ? new Date(conversation.lastMessageAt).toLocaleString() : ""}
                      </span>
                      {conversation.mailboxAddress && (
                        <span className="truncate text-[11px] text-slate-400 dark:text-slate-500">{conversation.mailboxAddress}</span>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      <Card className="flex min-h-0 flex-1 flex-col p-0">
        {selected ? (
          <MailThreadPanel conversation={selected} />
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <EmptyState icon={Mail} title="Select a conversation" description="Pick an email on the left to view its thread." />
          </div>
        )}
      </Card>
    </div>
  );
}

function MailThreadPanel({ conversation }: { conversation: MailInboxConversation }) {
  const { data: messages, isLoading } = useMailConversationMessages(conversation.id);
  const markRead = useMarkMailConversationRead();
  const sendReply = useSendMailReply(conversation.id);
  const canSend = useHasPermission("mail:send");
  const [replyBody, setReplyBody] = useState("");

  useEffect(() => {
    if (conversation.unreadCount > 0) markRead.mutate(conversation.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id]);

  function handleSend() {
    if (!replyBody.trim()) return;
    sendReply.mutate(
      { body: replyBody.trim() },
      {
        onSuccess: () => {
          toast.success("Reply sent");
          setReplyBody("");
        },
        onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to send reply"),
      },
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-slate-200 p-4 dark:border-slate-800">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100">{conversation.subject || "(no subject)"}</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {conversation.leadName || conversation.contactName || conversation.participantEmail || "Unknown sender"}
          {conversation.mailboxAddress ? ` · to ${conversation.mailboxAddress}` : ""}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <PageSpinner />
        ) : !messages || messages.length === 0 ? (
          <EmptyState icon={Mail} title="No messages yet" />
        ) : (
          <ul className="flex flex-col gap-3">
            {messages.map((message) => {
              const isOutbound = message.senderType === "AGENT";
              return (
                <li key={message.id} className={clsx("flex", isOutbound ? "justify-end" : "justify-start")}>
                  <div
                    className={clsx(
                      "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                      isOutbound ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100",
                    )}
                  >
                    <p className="whitespace-pre-wrap">{message.body}</p>
                    <div
                      className={clsx(
                        "mt-1 flex items-center gap-1 text-[11px]",
                        isOutbound ? "text-brand-100" : "text-slate-400 dark:text-slate-500",
                      )}
                    >
                      <span>{new Date(message.createdAt).toLocaleString()}</span>
                      {message.mailboxAddress && <span>· {isOutbound ? "from" : "to"} {message.mailboxAddress}</span>}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {canSend && (
        <div className="flex flex-col gap-2 border-t border-slate-200 p-3 dark:border-slate-800">
          <Textarea placeholder="Reply…" rows={3} value={replyBody} onChange={(e) => setReplyBody(e.target.value)} />
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

function MailSentTab() {
  const [search, setSearch] = useState("");
  const { data, isLoading, isError, refetch } = useMailSent({ page: 1, pageSize: 50, search: search || undefined });
  const items = data?.items ?? [];

  return (
    <Card className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
      <div className="border-b border-slate-200 p-3 dark:border-slate-800">
        <Input placeholder="Search sent by subject…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <PageSpinner />
        ) : isError ? (
          <div className="p-4">
            <ErrorState onRetry={() => refetch()} />
          </div>
        ) : items.length === 0 ? (
          <EmptyState icon={Mail} title="No sent emails yet" />
        ) : (
          <ul>
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{item.subject ?? "(no subject)"}</p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {item.from ? `${item.from} · ` : ""}To: {item.to.join(", ") || "—"}
                  </p>
                  <p className="truncate text-xs text-slate-400 dark:text-slate-500">{item.snippet}</p>
                </div>
                <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">{new Date(item.date).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
