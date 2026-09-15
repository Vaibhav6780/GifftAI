import type { LoginResult } from "@gifftai/shared";
import { authRepository, type RefreshTokenMeta } from "./auth.repository";
import { comparePassword, hashOpaqueToken, hashPassword, generateOpaqueToken } from "../../lib/hash";
import { signAccessToken, getAccessTokenExpiryIso } from "../../lib/jwt";
import { loadRequestUser } from "../../lib/loadRequestUser";
import { AppError } from "../../lib/apiError";
import { env } from "../../config/env";
import { emailQueue } from "../../jobs/queues/email.queue";
import { passwordResetEmail } from "../../lib/emailTemplates";
import { attendanceService } from "../attendance/attendance.service";

const REFRESH_TOKEN_TTL_MS = env.REFRESH_TOKEN_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000;
const RESET_TOKEN_TTL_MS = env.RESET_TOKEN_EXPIRES_IN_MINUTES * 60 * 1000;

export interface IssuedTokens {
  loginResult: LoginResult;
  refreshTokenId: string;
  refreshTokenRaw: string;
  refreshTokenExpiresAt: Date;
}

async function issueTokensForUser(userId: string, meta?: RefreshTokenMeta): Promise<IssuedTokens> {
  const user = await loadRequestUser(userId);
  if (!user) throw AppError.unauthorized("Account is inactive or no longer exists");

  const accessToken = signAccessToken(userId);
  const refreshTokenRaw = generateOpaqueToken();
  const refreshTokenExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  const refreshToken = await authRepository.createRefreshToken({
    userId,
    tokenHash: hashOpaqueToken(refreshTokenRaw),
    expiresAt: refreshTokenExpiresAt,
    meta,
  });

  return {
    loginResult: {
      user,
      tokens: { accessToken, accessTokenExpiresAt: getAccessTokenExpiryIso(accessToken) },
    },
    refreshTokenId: refreshToken.id,
    refreshTokenRaw,
    refreshTokenExpiresAt,
  };
}

export const authService = {
  async login(email: string, password: string, meta: RefreshTokenMeta): Promise<IssuedTokens> {
    const user = await authRepository.findUserByEmail(email);
    if (!user || user.status !== "ACTIVE") {
      throw AppError.unauthorized("Invalid email or password");
    }

    const passwordMatches = await comparePassword(password, user.passwordHash);
    if (!passwordMatches) {
      throw AppError.unauthorized("Invalid email or password");
    }

    await authRepository.updateLastLogin(user.id);
    await authRepository.writeAuditLog({ userId: user.id, action: "auth.login", ...meta });

    return issueTokensForUser(user.id, meta);
  },

  async refresh(rawRefreshToken: string, meta: RefreshTokenMeta): Promise<IssuedTokens> {
    const tokenHash = hashOpaqueToken(rawRefreshToken);
    const existing = await authRepository.findRefreshTokenByHash(tokenHash);

    if (!existing || existing.revokedAt || existing.expiresAt < new Date()) {
      throw AppError.unauthorized("Refresh token is invalid or expired");
    }

    const issued = await issueTokensForUser(existing.userId, meta);
    await authRepository.revokeRefreshToken(existing.id, issued.refreshTokenId);

    return issued;
  },

  async logout(rawRefreshToken: string): Promise<void> {
    const tokenHash = hashOpaqueToken(rawRefreshToken);
    const existing = await authRepository.findRefreshTokenByHash(tokenHash);
    if (existing && !existing.revokedAt) {
      await authRepository.revokeRefreshToken(existing.id);
      await authRepository.writeAuditLog({ userId: existing.userId, action: "auth.logout" });
      await attendanceService.autoCloseIfRemote(existing.userId);
    }
  },

  async forgotPassword(email: string): Promise<void> {
    const user = await authRepository.findUserByEmail(email);
    // Always resolve successfully — never reveal whether an email is registered.
    if (!user || user.status !== "ACTIVE") return;

    const rawToken = generateOpaqueToken();
    await authRepository.createPasswordResetToken({
      userId: user.id,
      tokenHash: hashOpaqueToken(rawToken),
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    });

    const resetUrl = `${env.WEB_URL}/reset-password?token=${rawToken}`;
    const { subject, html } = passwordResetEmail({ firstName: user.firstName, resetUrl });

    await emailQueue.add("password-reset", { to: user.email, subject, html });
  },

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const tokenHash = hashOpaqueToken(rawToken);
    const resetToken = await authRepository.findValidPasswordResetTokenByHash(tokenHash);

    if (!resetToken) {
      throw AppError.badRequest("This reset link is invalid or has expired");
    }

    const passwordHash = await hashPassword(newPassword);
    await authRepository.updatePassword(resetToken.userId, passwordHash);
    await authRepository.markEmailVerified(resetToken.userId);
    await authRepository.markPasswordResetTokenUsed(resetToken.id);
    await authRepository.revokeAllUserRefreshTokens(resetToken.userId);
    await authRepository.writeAuditLog({ userId: resetToken.userId, action: "auth.password_reset" });
  },

  async me(userId: string) {
    const user = await loadRequestUser(userId);
    if (!user) throw AppError.unauthorized();
    return user;
  },
};
