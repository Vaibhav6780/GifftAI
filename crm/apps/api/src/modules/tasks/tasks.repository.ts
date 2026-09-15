import type { Prisma } from "@prisma/client";
import type { BulkCreateTaskItemInput, ListTasksQuery } from "@gifftai/shared";
import { prisma } from "../../config/prisma";

const taskWithRelations = {
  assignedTo: { select: { id: true, firstName: true, lastName: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true } },
  lead: { select: { id: true, firstName: true, lastName: true } },
  contact: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.TaskInclude;

export type TaskWithRelations = Prisma.TaskGetPayload<{ include: typeof taskWithRelations }>;

/** Still-open statuses -- used both for the `overdue` filter and as the "always visible
 *  regardless of createdDate" carve-out below. */
const OPEN_STATUSES: Prisma.TaskWhereInput["status"] = { in: ["PENDING", "IN_PROGRESS"] };

const commentWithUser = {
  user: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.TaskCommentInclude;

const auditLogWithUser = {
  user: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.AuditLogInclude;

export const tasksRepository = {
  findById(id: string): Promise<TaskWithRelations | null> {
    return prisma.task.findUnique({ where: { id }, include: taskWithRelations });
  },

  async list(query: ListTasksQuery): Promise<{ items: TaskWithRelations[]; total: number }> {
    const commonFilters: Prisma.TaskWhereInput = {
      ...(query.overdue
        ? { status: OPEN_STATUSES, dueAt: { lt: new Date() } }
        : query.status
          ? { status: query.status }
          : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.assignedToId ? { assignedToId: query.assignedToId } : {}),
      ...(query.search ? { title: { contains: query.search, mode: "insensitive" } } : {}),
    };

    // Pending/In Progress tasks are still-open work, so createdDate never hides them,
    // whichever date is picked -- only other statuses (Completed, Cancelled) get narrowed to
    // that calendar day. Composes correctly with an explicit status filter: status=PENDING
    // already satisfies the "always visible" branch (so every matching row shows regardless
    // of date), while status=COMPLETED can never satisfy it (so only the date-range branch
    // has any effect, i.e. unchanged behavior for non-open statuses).
    const where: Prisma.TaskWhereInput = query.createdDate
      ? {
          ...commonFilters,
          OR: [
            {
              createdAt: {
                gte: new Date(`${query.createdDate}T00:00:00.000Z`),
                lte: new Date(`${query.createdDate}T23:59:59.999Z`),
              },
            },
            { status: OPEN_STATUSES },
          ],
        }
      : commonFilters;

    const [items, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: taskWithRelations,
        orderBy: { [query.sortBy]: query.sortOrder },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.task.count({ where }),
    ]);

    return { items, total };
  },

  create(data: {
    title: string;
    description?: string;
    type?: Prisma.TaskCreateInput["type"];
    priority?: Prisma.TaskCreateInput["priority"];
    status?: Prisma.TaskCreateInput["status"];
    dueAt?: Date | null;
    assignedToId?: string | null;
    createdById: string;
  }): Promise<TaskWithRelations> {
    return prisma.task.create({ data, include: taskWithRelations });
  },

  update(
    id: string,
    data: {
      title?: string;
      description?: string | null;
      type?: Prisma.TaskUpdateInput["type"];
      priority?: Prisma.TaskUpdateInput["priority"];
      status?: Prisma.TaskUpdateInput["status"];
      dueAt?: Date | null;
      assignedToId?: string | null;
    },
  ): Promise<TaskWithRelations> {
    return prisma.task.update({ where: { id }, data, include: taskWithRelations });
  },

  delete(id: string) {
    return prisma.task.delete({ where: { id } });
  },

  assignedToExists(id: string) {
    return prisma.user.findUnique({ where: { id }, select: { id: true } }).then(Boolean);
  },

  createComment(taskId: string, userId: string, body: string) {
    return prisma.taskComment.create({ data: { taskId, userId, body }, include: commentWithUser });
  },

  listComments(taskId: string) {
    return prisma.taskComment.findMany({
      where: { taskId },
      include: commentWithUser,
      orderBy: { createdAt: "asc" },
    });
  },

  /** Status-change entries written by tasksService.update as a dedicated "task.status_change"
   *  audit action (distinct from the generic "task.update" log), so the activity feed can
   *  query for exactly these without parsing arbitrary oldValue/newValue JSON shapes. */
  listStatusChanges(taskId: string) {
    return prisma.auditLog.findMany({
      where: { entityType: "Task", entityId: taskId, action: "task.status_change" },
      include: auditLogWithUser,
      orderBy: { createdAt: "asc" },
    });
  },

  /**
   * Creates every row in `tasks`, all assigned to `assignedToId`, inside one transaction —
   * if any create fails, none of them are persisted.
   */
  bulkCreate(
    assignedToId: string,
    createdById: string,
    tasks: BulkCreateTaskItemInput[],
  ): Promise<TaskWithRelations[]> {
    return prisma.$transaction((tx) =>
      Promise.all(
        tasks.map((task) =>
          tx.task.create({
            data: {
              title: task.title,
              description: task.description,
              priority: task.priority,
              dueAt: task.dueAt ? new Date(task.dueAt) : undefined,
              assignedToId,
              createdById,
            },
            include: taskWithRelations,
          }),
        ),
      ),
    );
  },
};
