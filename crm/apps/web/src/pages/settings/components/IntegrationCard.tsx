import { useState } from "react";
import type { IntegrationConnectionSummary } from "@gifftai/shared";
import { Card } from "../../../components/ui/Card";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { toast } from "../../../components/ui/Toast";
import { PlatformIcon, PLATFORM_LABEL } from "../../../components/icons/PlatformIcons";
import {
  useDisconnectIntegration,
  useResyncIntegration,
  useStartOAuth,
  useSyncWhatsappContacts,
  useStartWhatsappHistoryImport,
  useWhatsappHistoryImportStatus,
} from "../../../features/integrations/api";

const STATUS_VARIANT: Record<IntegrationConnectionSummary["status"], "success" | "neutral" | "danger" | "warning"> = {
  CONNECTED: "success",
  DISCONNECTED: "neutral",
  ERROR: "danger",
  PENDING: "warning",
};

interface IntegrationCardProps {
  summary: IntegrationConnectionSummary;
  /** Opens the platform's connect modal (Telegram/WhatsApp) or CSV import modal (LinkedIn). */
  onOpenModal: () => void;
}

export function IntegrationCard({ summary, onOpenModal }: IntegrationCardProps) {
  const disconnect = useDisconnectIntegration();
  const resync = useResyncIntegration();
  const startOAuth = useStartOAuth();
  const syncContacts = useSyncWhatsappContacts();
  const importHistory = useStartWhatsappHistoryImport();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isWebsite = summary.channelType === "WEBSITE";
  const isOAuthPlatform = summary.channelType === "INSTAGRAM" || summary.channelType === "LINKEDIN";
  const isDisconnected = summary.status === "DISCONNECTED" || summary.status === "ERROR";
  const isConnectedWhatsapp = summary.channelType === "WHATSAPP" && !isDisconnected;

  const { data: historyImportStatus } = useWhatsappHistoryImportStatus({ enabled: isConnectedWhatsapp });
  const isImporting = importHistory.isPending || historyImportStatus?.status === "RUNNING";

  function handleConnect() {
    if (summary.channelType === "INSTAGRAM" || summary.channelType === "LINKEDIN") {
      startOAuth.mutate(summary.channelType === "INSTAGRAM" ? "instagram" : "linkedin", {
        onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to start connection"),
      });
    } else {
      onOpenModal();
    }
  }

  function handleDisconnect() {
    disconnect.mutate(summary.channelType, {
      onSuccess: () => {
        toast.success(`${PLATFORM_LABEL[summary.channelType]} disconnected`);
        setConfirmOpen(false);
      },
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : "Failed to disconnect");
        setConfirmOpen(false);
      },
    });
  }

  function handleResync() {
    resync.mutate(summary.channelType, {
      onSuccess: (result) => {
        if (result.ok) toast.success("Synced successfully");
        else toast.error(result.error ?? "Sync failed");
      },
      onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to resync"),
    });
  }

  function handleSyncContacts() {
    syncContacts.mutate(undefined, {
      onSuccess: (result) =>
        toast.success(`Synced contacts: ${result.imported} new, ${result.updated} updated, ${result.skipped} skipped`),
      onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to sync contacts"),
    });
  }

  function handleImportHistory() {
    importHistory.mutate(undefined, {
      onSuccess: () => toast.success("History import started — this can take a while for large contact lists"),
      onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to start import"),
    });
  }

  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <PlatformIcon channelType={summary.channelType} size={24} />
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">{PLATFORM_LABEL[summary.channelType]}</h3>
            {summary.externalAccountId && <p className="text-xs text-slate-500 dark:text-slate-400">{summary.externalAccountId}</p>}
          </div>
        </div>
        <Badge variant={STATUS_VARIANT[summary.status]}>{summary.status}</Badge>
      </div>

      <div className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
        <span>Last synced: {summary.lastSyncedAt ? new Date(summary.lastSyncedAt).toLocaleString() : "Never"}</span>
        {summary.connectedByName && <span>Connected by: {summary.connectedByName}</span>}
        {summary.lastError && <span className="text-red-600 dark:text-red-400">Error: {summary.lastError}</span>}
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {isWebsite ? (
          <Badge variant="info">Always on — no setup needed</Badge>
        ) : isDisconnected ? (
          <Button size="sm" onClick={handleConnect} isLoading={isOAuthPlatform && startOAuth.isPending}>
            {summary.channelType === "LINKEDIN" ? "Connect (identity only)" : "Connect"}
          </Button>
        ) : (
          <>
            <Button size="sm" variant="secondary" onClick={handleResync} isLoading={resync.isPending}>
              Re-sync now
            </Button>
            {summary.channelType === "WHATSAPP" && (
              <>
                <Button size="sm" variant="secondary" onClick={handleSyncContacts} isLoading={syncContacts.isPending}>
                  Sync Contacts
                </Button>
                <Button size="sm" variant="secondary" onClick={handleImportHistory} isLoading={isImporting} disabled={isImporting}>
                  Import WhatsApp History
                </Button>
              </>
            )}
            <Button size="sm" variant="danger" onClick={() => setConfirmOpen(true)}>
              Disconnect
            </Button>
          </>
        )}
        {summary.channelType === "LINKEDIN" && (
          <Button size="sm" variant="secondary" onClick={onOpenModal}>
            Import CSV
          </Button>
        )}
      </div>

      {isConnectedWhatsapp && historyImportStatus && historyImportStatus.status !== "IDLE" && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {historyImportStatus.status === "RUNNING" &&
            `Importing history… ${historyImportStatus.contactsProcessed} contacts, ${historyImportStatus.messagesImported} messages so far.`}
          {historyImportStatus.status === "COMPLETED" &&
            `Last import: ${historyImportStatus.leadsImported} new leads, ${historyImportStatus.leadsUpdated} updated, ${historyImportStatus.messagesImported} messages.` +
              (historyImportStatus.contactsSkipped > 0
                ? ` ${historyImportStatus.contactsSkipped} contact${historyImportStatus.contactsSkipped === 1 ? "" : "s"} skipped due to errors.`
                : "")}
          {historyImportStatus.status === "FAILED" && (
            <span className="text-red-600 dark:text-red-400">History import failed: {historyImportStatus.error}</span>
          )}
        </p>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title={`Disconnect ${PLATFORM_LABEL[summary.channelType]}`}
        description={`New ${PLATFORM_LABEL[summary.channelType]} messages will stop being captured until you reconnect. Continue?`}
        confirmLabel="Disconnect"
        isLoading={disconnect.isPending}
        onConfirm={handleDisconnect}
        onCancel={() => setConfirmOpen(false)}
      />
    </Card>
  );
}
