import type { TicketPriority, TicketStatus } from "@gifftai/shared";

export const STATUS_VARIANT: Record<TicketStatus, "info" | "warning" | "success" | "danger"> = {
  OPEN: "info",
  PENDING: "warning",
  RESOLVED: "success",
  CLOSED: "success",
};

export const STATUS_OPTIONS: TicketStatus[] = ["OPEN", "PENDING", "RESOLVED", "CLOSED"];

export const PRIORITY_VARIANT: Record<TicketPriority, "neutral" | "info" | "warning" | "danger"> = {
  LOW: "neutral",
  MEDIUM: "info",
  HIGH: "warning",
  URGENT: "danger",
};

export const PRIORITY_OPTIONS: TicketPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
