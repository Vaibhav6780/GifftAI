import { prisma } from "../../config/prisma";
import { writeAuditLog } from "../../lib/auditLog";

export interface RefreshTokenMeta {
  userAgent?: string;
  ipAddress?: string;
}

export const authRepository = {
  findUserByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  findUserById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  },

  updateLastLogin(userId: string) {
    return prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
  },

  updatePassword(userId: string, passwordHash: string) {
    return prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  },

  markEmailVerified(userId: string) {
    return prisma.user.update({ where: { id: userId }, data: { isEmailVerified: true } });
  },

  createRefreshToken(params: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    meta?: RefreshTokenMeta;
  }) {
    return prisma.refreshToken.create({
      data: {
        userId: params.userId,
        tokenHash: params.tokenHash,
        expiresAt: params.expiresAt,
        userAgent: params.meta?.userAgent,
        ipAddress: params.meta?.ipAddress,
      },
    });
  },

  findRefreshTokenByHash(tokenHash: string) {
    return prisma.refreshToken.findUnique({ where: { tokenHash } });
  },

  revokeRefreshToken(id: string, replacedById?: string) {
    return prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date(), ...(replacedById ? { replacedById } : {}) },
    });
  },

  revokeAllUserRefreshTokens(userId: string) {
    return prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  createPasswordResetToken(params: { userId: string; tokenHash: string; expiresAt: Date }) {
    return prisma.passwordResetToken.create({ data: params });
  },

  findValidPasswordResetTokenByHash(tokenHash: string) {
    return prisma.passwordResetToken.findFirst({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
    });
  },

  markPasswordResetTokenUsed(id: string) {
    return prisma.passwordResetToken.update({ where: { id }, data: { usedAt: new Date() } });
  },

  writeAuditLog(params: { userId?: string; action: string; ipAddress?: string; userAgent?: string }) {
    return writeAuditLog({
      userId: params.userId,
      action: params.action,
      entityType: "User",
      entityId: params.userId ?? "unknown",
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  },
};
