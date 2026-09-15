import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  IntegrationChannelType,
  IntegrationConnectionSummary,
  LinkedInImportResult,
  PaginatedResult,
  TelegramConnectInput,
  TelegramInboxConversation,
  TelegramInboxQuery,
  WhatsappAccountInfo,
  WhatsappConnectInput,
  WhatsappHistoryImportProgress,
  WhatsappInboxConversation,
  WhatsappInboxQuery,
  WhatsappSyncContactsResult,
  WhatsappSyncConversationResult,
} from "@gifftai/shared";
import { apiClient } from "../../lib/apiClient";
import { unwrap } from "../../lib/unwrap";

const LIST_KEY = ["integrations"] as const;

export function useIntegrationsList() {
  return useQuery({
    queryKey: LIST_KEY,
    queryFn: () => unwrap<IntegrationConnectionSummary[]>(apiClient.get("/integrations")),
  });
}

export function useDisconnectIntegration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (channelType: IntegrationChannelType) => unwrap<null>(apiClient.post(`/integrations/${channelType}/disconnect`)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

export function useResyncIntegration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (channelType: IntegrationChannelType) =>
      unwrap<{ ok: boolean; error?: string }>(apiClient.post(`/integrations/${channelType}/resync`)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

export function useConnectTelegram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TelegramConnectInput) =>
      unwrap<{ username?: string; mode: string }>(apiClient.post("/integrations/telegram/connect", input)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

export function useTelegramInbox(query: Partial<TelegramInboxQuery>) {
  return useQuery({
    queryKey: ["integrations", "telegram", "inbox", query] as const,
    queryFn: () =>
      unwrap<PaginatedResult<TelegramInboxConversation>>(apiClient.get("/integrations/telegram/inbox", { params: query })),
  });
}

export function useSendTelegramReply(leadId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (message: string) =>
      unwrap<null>(apiClient.post(`/integrations/telegram/leads/${leadId}/reply`, { message })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leads", leadId, "timeline"] }),
  });
}

export function useConnectWhatsapp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: WhatsappConnectInput) =>
      unwrap<WhatsappAccountInfo>(apiClient.post("/integrations/whatsapp/connect", input)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

/** Verifies API key/secret against WaHamster's GET /account without saving anything —
 *  backs the connect modal's standalone "Test Connection" button. */
export function useTestWhatsappConnection() {
  return useMutation({
    mutationFn: (input: WhatsappConnectInput) =>
      unwrap<WhatsappAccountInfo>(apiClient.post("/integrations/whatsapp/test", input)),
  });
}

export function useSyncWhatsappContacts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => unwrap<WhatsappSyncContactsResult>(apiClient.post("/integrations/whatsapp/sync-contacts")),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

const HISTORY_IMPORT_STATUS_KEY = ["integrations", "whatsapp", "import-history", "status"] as const;

/** Enqueues the bulk "Import WhatsApp History" background job — returns as soon as it's
 *  queued, not when it finishes. Progress is tracked separately via
 *  useWhatsappHistoryImportStatus, which the caller should start polling on success. */
export function useStartWhatsappHistoryImport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => unwrap<{ status: "queued" }>(apiClient.post("/integrations/whatsapp/import-history")),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: HISTORY_IMPORT_STATUS_KEY }),
  });
}

/** Polls while the import is running, stops once it settles — the Settings UI uses this to
 *  show a live progress readout without the caller managing an interval by hand. `enabled`
 *  lets callers (e.g. every platform's IntegrationCard) skip the request entirely unless
 *  they're actually the connected WhatsApp card. */
export function useWhatsappHistoryImportStatus(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: HISTORY_IMPORT_STATUS_KEY,
    queryFn: () => unwrap<WhatsappHistoryImportProgress>(apiClient.get("/integrations/whatsapp/import-history/status")),
    refetchInterval: (query) => (query.state.data?.status === "RUNNING" ? 2000 : false),
    enabled: options?.enabled ?? true,
  });
}

export function useWhatsappInbox(query: Partial<WhatsappInboxQuery>) {
  return useQuery({
    queryKey: ["integrations", "whatsapp", "inbox", query] as const,
    queryFn: () =>
      unwrap<PaginatedResult<WhatsappInboxConversation>>(apiClient.get("/integrations/whatsapp/inbox", { params: query })),
  });
}

/** Fetches the provider's authorization URL (as JSON — see instagram.oauth.ts for why)
 *  then navigates the whole page there; the OAuth callback redirects back to this app. */
export function useStartOAuth() {
  return useMutation({
    mutationFn: async (platform: "instagram" | "linkedin") => {
      const { url } = await unwrap<{ url: string }>(apiClient.get(`/integrations/${platform}/oauth/start`));
      window.location.href = url;
    },
  });
}

/** Pulls a lead's WhatsApp history (GET /messages/{phone} on the WaHamster side) into its
 *  CRM timeline — useful for backfilling a conversation that predates connecting WhatsApp. */
export function useSyncLeadWhatsapp(leadId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      unwrap<WhatsappSyncConversationResult>(apiClient.post(`/integrations/whatsapp/leads/${leadId}/sync`)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leads", leadId, "timeline"] }),
  });
}

export function useSendWhatsappReply(leadId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (message: string) =>
      unwrap<null>(apiClient.post(`/integrations/whatsapp/leads/${leadId}/reply`, { message })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leads", leadId, "timeline"] }),
  });
}

export function useImportLinkedInCsv() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return unwrap<LinkedInImportResult>(
        apiClient.post("/integrations/linkedin/import", formData, {
          headers: { "content-type": "multipart/form-data" },
        }),
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LIST_KEY }),
  });
}
