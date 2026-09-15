import { useState } from "react";
import { Plug } from "lucide-react";
import type { IntegrationChannelType } from "@gifftai/shared";
import { useIntegrationsList } from "../../features/integrations/api";
import { Card } from "../../components/ui/Card";
import { PageSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { IntegrationCard } from "./components/IntegrationCard";
import { TelegramConnectModal } from "./components/TelegramConnectModal";
import { WhatsAppConnectModal } from "./components/WhatsAppConnectModal";
import { LinkedInCsvImportModal } from "./components/LinkedInCsvImportModal";
import { MailConnectModal } from "./components/MailConnectModal";

export function IntegrationsPage() {
  const { data: integrations, isLoading, isError, refetch } = useIntegrationsList();
  const [openModal, setOpenModal] = useState<IntegrationChannelType | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Integrations</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Connect lead sources so new inquiries automatically appear in Leads — no manual entry.
        </p>
      </div>

      {isLoading ? (
        <PageSpinner />
      ) : isError ? (
        <Card className="p-6">
          <ErrorState onRetry={() => refetch()} />
        </Card>
      ) : integrations?.length === 0 ? (
        <Card className="p-6">
          <EmptyState icon={Plug} title="No integrations available" />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {integrations?.map((summary) => (
            <IntegrationCard key={summary.channelType} summary={summary} onOpenModal={() => setOpenModal(summary.channelType)} />
          ))}
        </div>
      )}

      <TelegramConnectModal open={openModal === "TELEGRAM"} onClose={() => setOpenModal(null)} />
      <WhatsAppConnectModal open={openModal === "WHATSAPP"} onClose={() => setOpenModal(null)} />
      <LinkedInCsvImportModal open={openModal === "LINKEDIN"} onClose={() => setOpenModal(null)} />
      <MailConnectModal open={openModal === "EMAIL"} onClose={() => setOpenModal(null)} />
    </div>
  );
}
