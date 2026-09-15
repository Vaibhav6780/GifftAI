import type { IntegrationChannelType } from "@gifftai/shared";
import { Badge } from "../../../components/ui/Badge";
import { PlatformIcon, PLATFORM_LABEL } from "../../../components/icons/PlatformIcons";

const LABEL_TO_CHANNEL: Partial<Record<string, IntegrationChannelType>> = Object.fromEntries(
  (Object.entries(PLATFORM_LABEL) as [IntegrationChannelType, string][]).map(([channel, label]) => [label, channel]),
);

/** Shows a platform icon next to the source name when the Lead's source matches one of the
 *  5 auto-ingestion channels (Website/Instagram/WhatsApp/LinkedIn/Telegram); other sources
 *  (Referral, Cold Call, ...) just render as plain text. */
export function LeadSourceBadge({ sourceName }: { sourceName: string | null }) {
  if (!sourceName) return <Badge variant="neutral">No source</Badge>;

  const channelType = LABEL_TO_CHANNEL[sourceName];
  return (
    <Badge variant="neutral" className="gap-1.5">
      {channelType && <PlatformIcon channelType={channelType} size={14} />}
      {sourceName}
    </Badge>
  );
}
