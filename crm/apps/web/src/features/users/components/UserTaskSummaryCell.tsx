import { useState } from "react";
import type { UserSummary } from "@gifftai/shared";
import { UserTasksModal, type TaskSummaryFilter } from "../../../pages/users/UserTasksModal";
import { OVERDUE_BADGE_VARIANT, TASK_STATUS_VARIANT } from "../../../pages/tasks/constants";
import { Badge } from "../../../components/ui/Badge";

const TASK_SUMMARY_BADGES: { filter: TaskSummaryFilter; label: string; variant: "info" | "warning" | "success" | "danger" }[] = [
  { filter: "PENDING", label: "Pending", variant: TASK_STATUS_VARIANT.PENDING },
  { filter: "IN_PROGRESS", label: "In Progress", variant: TASK_STATUS_VARIANT.IN_PROGRESS },
  { filter: "COMPLETED", label: "Completed", variant: TASK_STATUS_VARIANT.COMPLETED },
  { filter: "OVERDUE", label: "Overdue", variant: OVERDUE_BADGE_VARIANT },
];

function taskCountFor(user: UserSummary, filter: TaskSummaryFilter): number {
  switch (filter) {
    case "PENDING":
      return user.taskCounts.pending;
    case "IN_PROGRESS":
      return user.taskCounts.inProgress;
    case "COMPLETED":
      return user.taskCounts.completed;
    case "OVERDUE":
      return user.taskCounts.overdue;
    default:
      return 0;
  }
}

/** Clickable Pending/In Progress/Completed/Overdue badge row for a user's task load —
 *  shared by the Users list and the Tasks module's team-status view so both stay in sync. */
export function UserTaskSummaryCell({ user }: { user: UserSummary }) {
  const [modal, setModal] = useState<{ filter: TaskSummaryFilter; label: string } | null>(null);

  return (
    <>
      <div className="flex flex-wrap gap-1">
        {TASK_SUMMARY_BADGES.map(({ filter, label, variant }) => {
          const count = taskCountFor(user, filter);
          return (
            <button
              key={filter}
              type="button"
              onClick={() => setModal({ filter, label })}
              className="cursor-pointer rounded-full transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-brand-500"
              title={`${label}: ${count}`}
            >
              <Badge variant={variant} className={count === 0 ? "opacity-50" : undefined}>
                {label} {count}
              </Badge>
            </button>
          );
        })}
      </div>
      {modal && (
        <UserTasksModal
          open
          onClose={() => setModal(null)}
          userId={user.id}
          userName={`${user.firstName} ${user.lastName}`}
          filter={modal.filter}
          label={modal.label}
        />
      )}
    </>
  );
}
