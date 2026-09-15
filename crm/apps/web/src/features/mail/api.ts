import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  MailAccountInfo,
  MailComposeInput,
  MailComposeResult,
  MailConnectInput,
  MailInboxConversation,
  MailInboxQuery,
  MailMessageDetail,
  MailReplyInput,
  MailSentMessage,
  MailSentQuery,
  PaginatedResult,
} from "@gifftai/shared";
import { apiClient } from "../../lib/apiClient";
import { unwrap } from "../../lib/unwrap";

const INBOX_KEY = ["integrations", "hostinger-mail", "inbox"] as const;
const LIST_KEY = ["integrations"] as const;

export function useConnectHostingerMail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: MailConnectInput) => unwrap<MailAccountInfo>(apiClient.post("/integrations/hostinger-mail/connect", input)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

export function useTestHostingerMailConnection() {
  return useMutation({
    mutationFn: (input: MailConnectInput) => unwrap<MailAccountInfo>(apiClient.post("/integrations/hostinger-mail/test", input)),
  });
}

export function useMailInbox(query: Partial<MailInboxQuery>) {
  return useQuery({
    queryKey: [...INBOX_KEY, query] as const,
    queryFn: () => unwrap<PaginatedResult<MailInboxConversation>>(apiClient.get("/integrations/hostinger-mail/inbox", { params: query })),
    // Real-time arrival is webhook-driven server-side; a light poll here just keeps this
    // tab's list fresh without the user manually refreshing.
    refetchInterval: 30_000,
  });
}

export function useMailSent(query: Partial<MailSentQuery>) {
  return useQuery({
    queryKey: ["integrations", "hostinger-mail", "sent", query] as const,
    queryFn: () => unwrap<PaginatedResult<MailSentMessage>>(apiClient.get("/integrations/hostinger-mail/sent", { params: query })),
  });
}

export function useMailConversationMessages(conversationId: string | null) {
  return useQuery({
    queryKey: ["integrations", "hostinger-mail", "conversations", conversationId, "messages"] as const,
    queryFn: () => unwrap<MailMessageDetail[]>(apiClient.get(`/integrations/hostinger-mail/conversations/${conversationId}/messages`)),
    enabled: Boolean(conversationId),
  });
}

export function useMarkMailConversationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) => unwrap<null>(apiClient.post(`/integrations/hostinger-mail/conversations/${conversationId}/mark-read`)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: INBOX_KEY }),
  });
}

export function useSendMailReply(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: MailReplyInput) => unwrap<null>(apiClient.post(`/integrations/hostinger-mail/conversations/${conversationId}/reply`, input)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INBOX_KEY });
      queryClient.invalidateQueries({ queryKey: ["integrations", "hostinger-mail", "conversations", conversationId, "messages"] });
    },
  });
}

export function useComposeMail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: MailComposeInput) => unwrap<MailComposeResult>(apiClient.post("/integrations/hostinger-mail/compose", input)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: INBOX_KEY }),
  });
}
