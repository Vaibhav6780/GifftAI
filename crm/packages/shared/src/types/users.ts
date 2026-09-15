export type UserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

export interface UserRoleRef {
  id: string;
  name: string;
}

export interface UserTaskCounts {
  pending: number;
  inProgress: number;
  completed: number;
  /** Pending or in-progress tasks whose dueAt is in the past. Overlaps with pending/inProgress. */
  overdue: number;
}

export interface UserSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  jobTitle: string | null;
  status: UserStatus;
  departmentId: string | null;
  departmentName: string | null;
  roles: UserRoleRef[];
  lastLoginAt: string | null;
  createdAt: string;
  /** Count of leads currently owned by this user (Lead.ownerId), regardless of status. */
  assignedLeadsCount: number;
  /** Count of tasks currently assigned to this user (Task.assignedToId), regardless of status. */
  assignedTasksCount: number;
  /** Breakdown of assignedTasksCount by status, plus a derived overdue count. */
  taskCounts: UserTaskCounts;
}

export interface UserDetail extends UserSummary {
  isEmailVerified: boolean;
  updatedAt: string;
}
