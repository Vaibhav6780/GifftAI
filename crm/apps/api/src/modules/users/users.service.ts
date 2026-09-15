import type {
  CreateUserInput,
  ListUsersQuery,
  PaginatedResult,
  SetUserPasswordInput,
  SetUserRolesInput,
  UpdateUserInput,
  UpdateUserStatusInput,
  UserDetail,
  UserSummary,
  UserTaskCounts,
} from "@gifftai/shared";
import { ROLES } from "@gifftai/shared";
import { usersRepository, type UserWithRelations } from "./users.repository";
import { generateOpaqueToken, hashOpaqueToken, hashPassword } from "../../lib/hash";
import { AppError } from "../../lib/apiError";
import { writeAuditLog } from "../../lib/auditLog";
import { emailQueue } from "../../jobs/queues/email.queue";
import { welcomeEmail } from "../../lib/emailTemplates";
import { env } from "../../config/env";
import type { RequestMeta } from "../../lib/requestMeta";

const RESET_TOKEN_TTL_MS = env.RESET_TOKEN_EXPIRES_IN_MINUTES * 60 * 1000;

const ZERO_TASK_COUNTS: UserTaskCounts = { pending: 0, inProgress: 0, completed: 0, overdue: 0 };

async function getTaskCounts(userId: string): Promise<UserTaskCounts> {
  const counts = await usersRepository.taskCountsByUserIds([userId]);
  return counts.get(userId) ?? ZERO_TASK_COUNTS;
}

function toSummary(user: UserWithRelations, taskCounts: UserTaskCounts): UserSummary {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    jobTitle: user.jobTitle,
    status: user.status,
    departmentId: user.departmentId,
    departmentName: user.department?.name ?? null,
    roles: user.userRoles.map((ur) => ur.role),
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    assignedLeadsCount: user._count.ownedLeads,
    assignedTasksCount: user._count.assignedTasks,
    taskCounts,
  };
}

function toDetail(user: UserWithRelations, taskCounts: UserTaskCounts): UserDetail {
  return {
    ...toSummary(user, taskCounts),
    isEmailVerified: user.isEmailVerified,
    updatedAt: user.updatedAt.toISOString(),
  };
}

async function assertRoleIdsExist(roleIds: string[]): Promise<void> {
  const existing = await usersRepository.findExistingRoleIds(roleIds);
  const unknown = roleIds.filter((id) => !existing.has(id));
  if (unknown.length > 0) {
    throw AppError.badRequest("One or more roles do not exist", { unknownRoleIds: unknown });
  }
}

async function issueWelcomeEmail(user: { id: string; email: string; firstName: string }): Promise<void> {
  const rawToken = generateOpaqueToken();
  await usersRepository.createPasswordResetToken({
    userId: user.id,
    tokenHash: hashOpaqueToken(rawToken),
    expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
  });

  const resetUrl = `${env.WEB_URL}/reset-password?token=${rawToken}`;
  const { subject, html } = welcomeEmail({ firstName: user.firstName, resetUrl });
  await emailQueue.add("welcome", { to: user.email, subject, html });
}

export const usersService = {
  async list(query: ListUsersQuery): Promise<PaginatedResult<UserSummary>> {
    const { items, total } = await usersRepository.list(query);
    const taskCounts = await usersRepository.taskCountsByUserIds(items.map((u) => u.id));
    return {
      items: items.map((user) => toSummary(user, taskCounts.get(user.id) ?? ZERO_TASK_COUNTS)),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    };
  },

  async getById(id: string): Promise<UserDetail> {
    const user = await usersRepository.findById(id);
    if (!user) throw AppError.notFound("User not found");
    return toDetail(user, await getTaskCounts(id));
  },

  async create(input: CreateUserInput, actorId: string, meta: RequestMeta): Promise<UserDetail> {
    const existing = await usersRepository.findByEmail(input.email);
    if (existing) throw AppError.conflict("A user with this email already exists");

    await assertRoleIdsExist(input.roleIds);

    if (input.departmentId && !(await usersRepository.departmentExists(input.departmentId))) {
      throw AppError.badRequest("Department does not exist");
    }

    const passwordHash = await hashPassword(generateOpaqueToken());
    const user = await usersRepository.createWithRoles({ ...input, passwordHash });

    await issueWelcomeEmail(user);
    await writeAuditLog({
      userId: actorId,
      action: "user.create",
      entityType: "User",
      entityId: user.id,
      newValue: { email: user.email, roleIds: input.roleIds },
      ...meta,
    });

    return toDetail(user, ZERO_TASK_COUNTS);
  },

  async update(id: string, input: UpdateUserInput, actorId: string, meta: RequestMeta): Promise<UserDetail> {
    const existing = await usersRepository.findById(id);
    if (!existing) throw AppError.notFound("User not found");

    if (input.departmentId && !(await usersRepository.departmentExists(input.departmentId))) {
      throw AppError.badRequest("Department does not exist");
    }

    const updated = await usersRepository.updateProfile(id, input);
    await writeAuditLog({
      userId: actorId,
      action: "user.update",
      entityType: "User",
      entityId: id,
      newValue: input,
      ...meta,
    });

    return toDetail(updated, await getTaskCounts(id));
  },

  async updateStatus(
    id: string,
    input: UpdateUserStatusInput,
    actorId: string,
    meta: RequestMeta,
  ): Promise<UserDetail> {
    if (id === actorId) throw AppError.forbidden("You cannot change your own status");

    const existing = await usersRepository.findById(id);
    if (!existing) throw AppError.notFound("User not found");

    const updated = await usersRepository.updateStatus(id, input.status);
    if (input.status !== "ACTIVE") {
      await usersRepository.revokeAllRefreshTokens(id);
    }

    await writeAuditLog({
      userId: actorId,
      action: "user.status_change",
      entityType: "User",
      entityId: id,
      oldValue: { status: existing.status },
      newValue: { status: input.status },
      ...meta,
    });

    return toDetail(updated, await getTaskCounts(id));
  },

  async setRoles(id: string, input: SetUserRolesInput, actorId: string, meta: RequestMeta): Promise<UserDetail> {
    if (id === actorId) throw AppError.forbidden("You cannot change your own roles");

    const existing = await usersRepository.findById(id);
    if (!existing) throw AppError.notFound("User not found");

    await assertRoleIdsExist(input.roleIds);

    const updated = await usersRepository.setRoles(id, input.roleIds);
    await writeAuditLog({
      userId: actorId,
      action: "user.roles_update",
      entityType: "User",
      entityId: id,
      oldValue: { roleIds: existing.userRoles.map((ur) => ur.roleId) },
      newValue: { roleIds: input.roleIds },
      ...meta,
    });

    return toDetail(updated, await getTaskCounts(id));
  },

  async setPassword(id: string, input: SetUserPasswordInput, actorId: string, meta: RequestMeta): Promise<UserDetail> {
    const existing = await usersRepository.findById(id);
    if (!existing) throw AppError.notFound("User not found");

    const passwordHash = await hashPassword(input.password);
    const updated = await usersRepository.updatePasswordHash(id, passwordHash);
    await usersRepository.revokeAllRefreshTokens(id);

    await writeAuditLog({
      userId: actorId,
      action: "user.password_changed",
      entityType: "User",
      entityId: id,
      ...meta,
    });

    return toDetail(updated, await getTaskCounts(id));
  },

  deactivate(id: string, actorId: string, meta: RequestMeta): Promise<UserDetail> {
    return usersService.updateStatus(id, { status: "INACTIVE" }, actorId, meta);
  },

  /**
   * Irreversibly removes the user row itself — distinct from deactivate (status flip,
   * fully reversible, preserves every historical record). Gated by users:delete_permanent
   * (Super Admin only, see permissions.ts). Refuses rather than silently destroying data:
   * blocks on any content this user created/authored/owns (tasks, notes, task comments,
   * events, campaigns, etc. — see usersRepository.getBlockingContentSummary), and blocks
   * deleting the last remaining Super Admin. Session/security rows (refresh tokens, trusted
   * device, attendance history) and ownership of leads/contacts/deals/tickets (which just
   * become unowned) are the only things actually removed/affected.
   */
  async hardDelete(id: string, actorId: string, meta: RequestMeta): Promise<void> {
    if (id === actorId) throw AppError.forbidden("You cannot delete your own account");

    const existing = await usersRepository.findById(id);
    if (!existing) throw AppError.notFound("User not found");

    const isSuperAdmin = existing.userRoles.some((ur) => ur.role.name === ROLES.SUPER_ADMIN);
    if (isSuperAdmin) {
      const superAdminCount = await usersRepository.countUsersWithRole(ROLES.SUPER_ADMIN);
      if (superAdminCount <= 1) {
        throw AppError.badRequest("Cannot delete the last Super Admin — assign the role to someone else first");
      }
    }

    const blocking = await usersRepository.getBlockingContentSummary(id);
    if (blocking.length > 0) {
      const summary = blocking.map((entry) => `${entry.count} ${entry.label}`).join(", ");
      throw AppError.badRequest(
        `Cannot permanently delete this user — they still have ${summary}. Reassign or remove this content first, or use Deactivate instead.`,
        { blocking },
      );
    }

    await usersRepository.hardDelete(id);
    await writeAuditLog({
      userId: actorId,
      action: "user.permanent_delete",
      entityType: "User",
      entityId: id,
      oldValue: { email: existing.email, firstName: existing.firstName, lastName: existing.lastName },
      ...meta,
    });
  },

  async resendWelcome(id: string, actorId: string, meta: RequestMeta): Promise<void> {
    const user = await usersRepository.findById(id);
    if (!user) throw AppError.notFound("User not found");
    if (user.isEmailVerified) {
      throw AppError.badRequest("User has already set their password");
    }

    await issueWelcomeEmail(user);
    await writeAuditLog({
      userId: actorId,
      action: "user.resend_welcome",
      entityType: "User",
      entityId: id,
      ...meta,
    });
  },
};
