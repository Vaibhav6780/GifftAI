import { Globe } from "lucide-react";
import { FaEnvelope, FaInstagram, FaLinkedin, FaTelegram, FaWhatsapp } from "react-icons/fa6";
import type { IconType } from "react-icons";
import type { IntegrationChannelType } from "@gifftai/shared";

const ICON_BY_CHANNEL: Record<Exclude<IntegrationChannelType, "WEBSITE">, IconType> = {
  INSTAGRAM: FaInstagram,
  WHATSAPP: FaWhatsapp,
  LINKEDIN: FaLinkedin,
  TELEGRAM: FaTelegram,
  EMAIL: FaEnvelope,
};

const COLOR_BY_CHANNEL: Record<IntegrationChannelType, string> = {
  WEBSITE: "text-slate-500 dark:text-slate-400",
  INSTAGRAM: "text-pink-600 dark:text-pink-400",
  WHATSAPP: "text-emerald-600 dark:text-emerald-400",
  LINKEDIN: "text-sky-700 dark:text-sky-400",
  TELEGRAM: "text-sky-500 dark:text-sky-400",
  EMAIL: "text-amber-600 dark:text-amber-400",
};

export function PlatformIcon({ channelType, size = 20, className }: { channelType: IntegrationChannelType; size?: number; className?: string }) {
  const Icon = channelType === "WEBSITE" ? Globe : ICON_BY_CHANNEL[channelType];
  return <Icon size={size} className={className ?? COLOR_BY_CHANNEL[channelType]} aria-hidden="true" />;
}

export const PLATFORM_LABEL: Record<IntegrationChannelType, string> = {
  WEBSITE: "Website",
  INSTAGRAM: "Instagram",
  WHATSAPP: "WhatsApp",
  LINKEDIN: "LinkedIn",
  TELEGRAM: "Telegram",
  EMAIL: "Hostinger Mail",
};
