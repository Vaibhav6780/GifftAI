import type { Request, Response } from "express";
import type { ApiResponse, LoginResult } from "@gifftai/shared";
import { authService } from "./auth.service";
import { asyncHandler } from "../../lib/asyncHandler";
import { AppError } from "../../lib/apiError";
import { requestMeta } from "../../lib/requestMeta";
import { env, isProduction } from "../../config/env";

const REFRESH_COOKIE_NAME = "refreshToken";

function refreshCookieOptions(maxAgeMs?: number) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict" as const,
    path: "/api/auth",
    domain: env.COOKIE_DOMAIN,
    ...(maxAgeMs !== undefined ? { maxAge: maxAgeMs } : {}),
  };
}

export const authController = {
  login: asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body as { email: string; password: string };
    const { loginResult, refreshTokenRaw, refreshTokenExpiresAt } = await authService.login(
      email,
      password,
      requestMeta(req),
    );

    res.cookie(REFRESH_COOKIE_NAME, refreshTokenRaw, {
      ...refreshCookieOptions(refreshTokenExpiresAt.getTime() - Date.now()),
    });

    const body: ApiResponse<LoginResult> = { success: true, data: loginResult };
    res.status(200).json(body);
  }),

  refresh: asyncHandler(async (req: Request, res: Response) => {
    // Requiring a custom header on this one cookie-authenticated endpoint blocks plain
    // cross-site form submissions (which can't set custom headers) from triggering it.
    if (req.header("x-requested-with") !== "XMLHttpRequest") {
      throw AppError.forbidden("Missing required request header");
    }

    const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
    if (!rawRefreshToken) {
      throw AppError.unauthorized("No refresh token present");
    }

    const { loginResult, refreshTokenRaw, refreshTokenExpiresAt } = await authService.refresh(
      rawRefreshToken,
      requestMeta(req),
    );

    res.cookie(REFRESH_COOKIE_NAME, refreshTokenRaw, {
      ...refreshCookieOptions(refreshTokenExpiresAt.getTime() - Date.now()),
    });

    const body: ApiResponse<LoginResult> = { success: true, data: loginResult };
    res.status(200).json(body);
  }),

  logout: asyncHandler(async (req: Request, res: Response) => {
    const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
    if (rawRefreshToken) {
      await authService.logout(rawRefreshToken);
    }
    res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions());

    const body: ApiResponse<null> = { success: true, data: null };
    res.status(200).json(body);
  }),

  forgotPassword: asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body as { email: string };
    await authService.forgotPassword(email);

    const body: ApiResponse<null> = { success: true, data: null };
    res.status(200).json(body);
  }),

  resetPassword: asyncHandler(async (req: Request, res: Response) => {
    const { token, password } = req.body as { token: string; password: string };
    await authService.resetPassword(token, password);

    const body: ApiResponse<null> = { success: true, data: null };
    res.status(200).json(body);
  }),

  me: asyncHandler(async (req: Request, res: Response) => {
    const user = await authService.me(req.user!.id);
    const body: ApiResponse<typeof user> = { success: true, data: user };
    res.status(200).json(body);
  }),
};
