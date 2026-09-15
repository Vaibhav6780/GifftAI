export type TaskType = "TASK" | "CALL" | "MEETING" | "FOLLOW_UP" | "EMAIL";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type TaskStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export interface TaskSummary {
  id: string;
  title: string;
  type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  dueAt: string | null;
  assignedToId: string | null;
  assignedToName: string | null;
  createdById: string;
  createdByName: string | null;
  createdAt: string;
  leadId: string | null;
  leadName: string | null;
  contactId: string | null;
  contactName: string | null;
}

export interface TaskDetail extends TaskSummary {
  description: string | null;
  completedAt: string | null;
  updatedAt: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  body: string;
  userId: string;
  userName: string;
  createdAt: string;
}

/** Merged, timestamped history of a task's status changes and progress-note comments. */
export interface TaskActivityEntry {
  id: string;
  kind: "status_change" | "comment";
  occurredAt: string;
  userId: string | null;
  userName: string | null;
  body: string | null;
  fromStatus: TaskStatus | null;
  toStatus: TaskStatus | null;
}
