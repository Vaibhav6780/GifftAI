import type { TaskPriority, TaskStatus } from "@gifftai/shared";

export const TASK_STATUS_VARIANT: Record<TaskStatus, "info" | "warning" | "success" | "danger"> = {
  PENDING: "info",
  IN_PROGRESS: "warning",
  COMPLETED: "success",
  CANCELLED: "danger",
};

export const TASK_STATUS_OPTIONS: TaskStatus[] = ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

export const TASK_PRIORITY_VARIANT: Record<TaskPriority, "neutral" | "info" | "warning" | "danger"> = {
  LOW: "neutral",
  MEDIUM: "info",
  HIGH: "warning",
  URGENT: "danger",
};

export const TASK_PRIORITY_OPTIONS: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export const TASK_TYPE_OPTIONS = ["TASK", "CALL", "MEETING", "FOLLOW_UP", "EMAIL"] as const;

/** "Overdue" isn't a TaskStatus — it's derived (PENDING/IN_PROGRESS with dueAt in the past). */
export const OVERDUE_BADGE_VARIANT = "danger" as const;
