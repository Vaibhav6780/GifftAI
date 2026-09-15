import type { Prisma } from "@prisma/client";
import type { ListUsersQuery, UserStatus, UserTaskCounts } from "@gifftai/shared";
import { prisma } from "../../config/prisma";

const userWithRelations = {
  department: { select: { id: true, name: true } },
  userRoles: { include: { role: { select: { id: true, name: true } } } },
  _count: { select: { ownedLeads: true, assignedTasks: true } },
} satisfies Prisma.UserInclude;

export type UserWithRelations = Prisma.UserGetPayload<{ include: typeof userWithRelations }>;

export const usersRepository = {
  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  findById(id: string): Promise<UserWithRelations | null> {
    return prisma.user.findUnique({ where: { id }, include: userWithRelations });
  },

  async list(query: ListUsersQuery): Promise<{ items: UserWithRelations[]; total: number }> {
    const where: Prisma.UserWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.departmentId ? { departmentId: query.departmentId } : {}),
      ...(query.roleId ? { userRoles: { some: { roleId: query.roleId } } } : {}),
      ...(query.search
        ? {
            OR: [
              { firstName: { contains: query.search, mode: "insensitive" } },
              { lastName: { contains: query.search, mode: "insensitive" } },
              { email: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: userWithRelations,
        orderBy: { [query.sortBy]: query.sortOrder },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.user.count({ where }),
    ]);

    return { items, total };
  },

  /**
   * Per-user task-status breakdown for a set of user ids, in exactly 2 aggregate queries
   * regardless of how many users are passed in (no N+1 — used by the Users list page's
   * Tasks column, which renders this for a whole page of users at once).
   */
  async taskCountsByUserIds(userIds: string[]): Promise<Map<string, UserTaskCounts>> {
    const counts = new Map<string, UserTaskCounts>();
    if (userIds.length === 0) return counts;

    for (const id of userIds) {
      counts.set(id, { pending: 0, inProgress: 0, completed: 0, overdue: 0 });
    }

    const now = new Date();
    const [byStatus, overdue] = await Promise.all([
      prisma.task.groupBy({
        by: ["assignedToId", "status"],
        where: { assignedToId: { in: userIds } },
        _count: { _all: true },
      }),
      prisma.task.groupBy({
        by: ["assignedToId"],
        where: {
          assignedToId: { in: userIds },
          status: { in: ["PENDING", "IN_PROGRESS"] },
          dueAt: { lt: now },
        },
        _count: { _all: true },
      }),
    ]);

    for (const group of byStatus) {
      if (!group.assignedToId) continue;
      const entry = counts.get(group.assignedToId);
      if (!entry) continue;
      if (group.status === "PENDING") entry.pending = group._count._all;
      else if (group.status === "IN_PROGRESS") entry.inProgress = group._count._all;
      else if (group.status === "COMPLETED") entry.completed = group._count._all;
    }

    for (const group of overdue) {
      if (!group.assignedToId) continue;
      const entry = counts.get(group.assignedToId);
      if (entry) entry.overdue = group._count._all;
    }

    return counts;
  },

  departmentExists(id: string) {
    return prisma.department.findUnique({ where: { id }, select: { id: true } }).then(Boolean);
  },

  async findExistingRoleIds(roleIds: string[]): Promise<Set<string>> {
    const roles = await prisma.role.findMany({ where: { id: { in: roleIds } }, select: { id: true } });
    return new Set(roles.map((r) => r.id));
  },

  createWithRoles(params: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    jobTitle?: string;
    departmentId?: string;
    passwordHash: string;
    roleIds: string[];
  }): Promise<UserWithRelations> {
    return prisma.user.create({
      data: {
        email: params.email,
        firstName: params.firstName,
        lastName: params.lastName,
        phone: params.phone,
        jobTitle: params.jobTitle,
        departmentId: params.departmentId,
        passwordHash: params.passwordHash,
        isEmailVerified: false,
        userRoles: { create: params.roleIds.map((roleId) => ({ roleId })) },
      },
      include: userWithRelations,
    });
  },

  updateProfile(
    id: string,
    data: {
      firstName?: string;
      lastName?: string;
      phone?: string | null;
      jobTitle?: string | null;
      departmentId?: string | null;
    },
  ): Promise<UserWithRelations> {
    return prisma.user.update({ where: { id }, data, include: userWithRelations });
  },

  updateStatus(id: string, status: UserStatus): Promise<UserWithRelations> {
    return prisma.user.update({ where: { id }, data: { status }, include: userWithRelations });
  },

  updatePasswordHash(id: string, passwordHash: string): Promise<UserWithRelations> {
    return prisma.user.update({ where: { id }, data: { passwordHash }, include: userWithRelations });
  },

  async setRoles(id: string, roleIds: string[]): Promise<UserWithRelations> {
    return prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({ where: { userId: id } });
      if (roleIds.length > 0) {
        await tx.userRole.createMany({ data: roleIds.map((roleId) => ({ userId: id, roleId })) });
      }
      return tx.user.findUniqueOrThrow({ where: { id }, include: userWithRelations });
    });
  },

  revokeAllRefreshTokens(userId: string) {
    return prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  createPasswordResetToken(params: { userId: string; tokenHash: string; expiresAt: Date }) {
    return prisma.passwordResetToken.create({ data: params });
  },

  /**
   * Counts every piece of substantive content this user created/authored/owns — the things
   * a hard delete would either be rejected for (Restrict FKs: tasks created, events
   * organized, campaigns/email templates/workflows created, folders owned, documents/
   * versions uploaded, articles authored, attachments uploaded) or would silently destroy
   * (Cascade FKs on Notes and TaskComments — real history, not session artifacts). Deliberately
   * excludes ownership/assignment relations that gracefully SetNull on delete (owned leads/
   * contacts/companies/deals, assigned tasks/tickets/conversations) — those just become
   * unowned, no data is lost. Returns only the non-zero entries.
   */
  async getBlockingContentSummary(userId: string): Promise<{ label: string; count: number }[]> {
    const [
      tasksCreated,
      notes,
      taskComments,
      eventsOrganized,
      campaigns,
      emailTemplates,
      workflows,
      folders,
      documents,
      documentVersions,
      articles,
      attachments,
    ] = await Promise.all([
      prisma.task.count({ where: { createdById: userId } }),
      prisma.note.count({ where: { userId } }),
      prisma.taskComment.count({ where: { userId } }),
      prisma.event.count({ where: { organizerId: userId } }),
      prisma.campaign.count({ where: { createdById: userId } }),
      prisma.emailTemplate.count({ where: { createdById: userId } }),
      prisma.workflow.count({ where: { createdById: userId } }),
      prisma.folder.count({ where: { ownerId: userId } }),
      prisma.document.count({ where: { uploadedById: userId } }),
      prisma.documentVersion.count({ where: { uploadedById: userId } }),
      prisma.article.count({ where: { authorId: userId } }),
      prisma.attachment.count({ where: { uploadedById: userId } }),
    ]);

    return [
      { label: "tasks created", count: tasksCreated },
      { label: "notes written", count: notes },
      { label: "task comments written", count: taskComments },
      { label: "events organized", count: eventsOrganized },
      { label: "campaigns created", count: campaigns },
      { label: "email templates created", count: emailTemplates },
      { label: "workflows created", count: workflows },
      { label: "folders owned", count: folders },
      { label: "documents uploaded", count: documents },
      { label: "document versions uploaded", count: documentVersions },
      { label: "articles authored", count: articles },
      { label: "attachments uploaded", count: attachments },
    ].filter((entry) => entry.count > 0);
  },

  /** Counts users holding a given role by name — used to block deleting the last Super Admin. */
  countUsersWithRole(roleName: string): Promise<number> {
    return prisma.userRole.count({ where: { role: { name: roleName } } });
  },

  hardDelete(id: string) {
    return prisma.user.delete({ where: { id } });
  },
};
