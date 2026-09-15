import type {
  BulkCreateTasksInput,
  CreateTaskCommentInput,
  CreateTaskInput,
  ListTasksQuery,
  PaginatedResult,
  TaskActivityEntry,
  TaskComment,
  TaskDetail,
  TaskStatus,
  TaskSummary,
  UpdateTaskInput,
} from "@gifftai/shared";
import { tasksRepository, type TaskWithRelations } from "./tasks.repository";
import { AppError } from "../../lib/apiError";
import { writeAuditLog } from "../../lib/auditLog";
import { isPrivilegedRole } from "../../lib/authz";
import type { RequestMeta } from "../../lib/requestMeta";
import type { RequestUser } from "../../types/express";

function toSummary(task: TaskWithRelations): TaskSummary {
  return {
    id: task.id,
    title: task.title,
    type: task.type,
    priority: task.priority,
    status: task.status,
    dueAt: task.dueAt?.toISOString() ?? null,
    assignedToId: task.assignedToId,
    assignedToName: task.assignedTo ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}` : null,
    createdById: task.createdById,
    createdByName: task.createdBy ? `${task.createdBy.firstName} ${task.createdBy.lastName}` : null,
    createdAt: task.createdAt.toISOString(),
    leadId: task.leadId,
    leadName: task.lead ? `${task.lead.firstName} ${task.lead.lastName}` : null,
    contactId: task.contactId,
    contactName: task.contact ? `${task.contact.firstName} ${task.contact.lastName}` : null,
  };
}

function toDetail(task: TaskWithRelations): TaskDetail {
  return {
    ...toSummary(task),
    description: task.description,
    completedAt: task.completedAt?.toISOString() ?? null,
    updatedAt: task.updatedAt.toISOString(),
  };
}

async function assertAssignedToExists(userId: string): Promise<void> {
  if (!(await tasksRepository.assignedToExists(userId))) {
    throw AppError.badRequest("Assignee does not exist");
  }
}

/** Only the user this task is assigned to, or an Admin/Super Admin, may change its status
 *  or add progress-note comments — regardless of how broad the caller's `tasks:update`
 *  permission grant is. */
function assertAssignedOrPrivileged(task: { assignedToId: string | null }, actor: RequestUser): void {
  if (task.assignedToId === actor.id || isPrivilegedRole(actor)) return;
  throw AppError.forbidden("Only the assigned user or an admin can do this");
}

export const tasksService = {
  async list(query: ListTasksQuery): Promise<PaginatedResult<TaskSummary>> {
    const { items, total } = await tasksRepository.list(query);
    return {
      items: items.map(toSummary),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    };
  },

  async getById(id: string): Promise<TaskDetail> {
    const task = await tasksRepository.findById(id);
    if (!task) throw AppError.notFound("Task not found");
    return toDetail(task);
  },

  async create(input: CreateTaskInput, actorId: string, meta: RequestMeta): Promise<TaskDetail> {
    if (input.assignedToId) await assertAssignedToExists(input.assignedToId);

    const task = await tasksRepository.create({
      ...input,
      dueAt: input.dueAt ? new Date(input.dueAt) : undefined,
      createdById: actorId,
    });

    await writeAuditLog({
      userId: actorId,
      action: "task.create",
      entityType: "Task",
      entityId: task.id,
      newValue: { title: input.title, assignedToId: input.assignedToId ?? null },
      ...meta,
    });

    return toDetail(task);
  },

  async update(id: string, input: UpdateTaskInput, actor: RequestUser, meta: RequestMeta): Promise<TaskDetail> {
    const existing = await tasksRepository.findById(id);
    if (!existing) throw AppError.notFound("Task not found");

    const statusChanging = input.status !== undefined && input.status !== existing.status;
    if (statusChanging) assertAssignedOrPrivileged(existing, actor);

    if (input.assignedToId) await assertAssignedToExists(input.assignedToId);

    const becomingCompleted = input.status === "COMPLETED" && existing.status !== "COMPLETED";
    const leavingCompleted = input.status && input.status !== "COMPLETED" && existing.status === "COMPLETED";

    const updated = await tasksRepository.update(id, {
      ...input,
      dueAt: input.dueAt !== undefined ? (input.dueAt ? new Date(input.dueAt) : null) : undefined,
      ...(becomingCompleted ? { completedAt: new Date() } : {}),
      ...(leavingCompleted ? { completedAt: null } : {}),
    });

    await writeAuditLog({
      userId: actor.id,
      action: "task.update",
      entityType: "Task",
      entityId: id,
      oldValue: { status: existing.status, assignedToId: existing.assignedToId },
      newValue: input,
      ...meta,
    });

    if (statusChanging) {
      await writeAuditLog({
        userId: actor.id,
        action: "task.status_change",
        entityType: "Task",
        entityId: id,
        oldValue: { status: existing.status },
        newValue: { status: input.status },
        ...meta,
      });
    }

    return toDetail(updated);
  },

  async addComment(id: string, input: CreateTaskCommentInput, actor: RequestUser, meta: RequestMeta): Promise<TaskComment> {
    const existing = await tasksRepository.findById(id);
    if (!existing) throw AppError.notFound("Task not found");

    assertAssignedOrPrivileged(existing, actor);

    const comment = await tasksRepository.createComment(id, actor.id, input.body);

    await writeAuditLog({
      userId: actor.id,
      action: "task.comment_create",
      entityType: "Task",
      entityId: id,
      newValue: { body: input.body },
      ...meta,
    });

    return {
      id: comment.id,
      taskId: id,
      body: comment.body,
      userId: comment.userId,
      userName: `${comment.user.firstName} ${comment.user.lastName}`,
      createdAt: comment.createdAt.toISOString(),
    };
  },

  async getActivity(id: string): Promise<TaskActivityEntry[]> {
    const existing = await tasksRepository.findById(id);
    if (!existing) throw AppError.notFound("Task not found");

    const [statusChanges, comments] = await Promise.all([
      tasksRepository.listStatusChanges(id),
      tasksRepository.listComments(id),
    ]);

    const entries: TaskActivityEntry[] = [];

    for (const change of statusChanges) {
      const oldValue = change.oldValue as { status?: TaskStatus } | null;
      const newValue = change.newValue as { status?: TaskStatus } | null;
      entries.push({
        id: change.id,
        kind: "status_change",
        occurredAt: change.createdAt.toISOString(),
        userId: change.userId,
        userName: change.user ? `${change.user.firstName} ${change.user.lastName}` : null,
        body: null,
        fromStatus: oldValue?.status ?? null,
        toStatus: newValue?.status ?? null,
      });
    }

    for (const comment of comments) {
      entries.push({
        id: comment.id,
        kind: "comment",
        occurredAt: comment.createdAt.toISOString(),
        userId: comment.userId,
        userName: `${comment.user.firstName} ${comment.user.lastName}`,
        body: comment.body,
        fromStatus: null,
        toStatus: null,
      });
    }

    entries.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
    return entries;
  },

  async bulkAssign(input: BulkCreateTasksInput, actorId: string, meta: RequestMeta): Promise<TaskDetail[]> {
    await assertAssignedToExists(input.assignedToId);

    const tasks = await tasksRepository.bulkCreate(input.assignedToId, actorId, input.tasks);

    await Promise.all(
      tasks.map((task) =>
        writeAuditLog({
          userId: actorId,
          action: "task.create",
          entityType: "Task",
          entityId: task.id,
          newValue: { title: task.title, assignedToId: input.assignedToId, bulk: true },
          ...meta,
        }),
      ),
    );

    return tasks.map(toDetail);
  },

  async remove(id: string, actorId: string, meta: RequestMeta): Promise<void> {
    const existing = await tasksRepository.findById(id);
    if (!existing) throw AppError.notFound("Task not found");

    await tasksRepository.delete(id);
    await writeAuditLog({
      userId: actorId,
      action: "task.delete",
      entityType: "Task",
      entityId: id,
      oldValue: { title: existing.title },
      ...meta,
    });
  },
};
