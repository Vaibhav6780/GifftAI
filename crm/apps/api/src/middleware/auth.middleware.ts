import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../lib/jwt";
import { loadRequestUser } from "../lib/loadRequestUser";
import { AppError } from "../lib/apiError";
import { asyncHandler } from "../lib/asyncHandler";

export const requireAuth = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const header = req.header("authorization");
  if (!header?.startsWith("Bearer ")) {
    throw AppError.unauthorized();
  }

  const token = header.slice("Bearer ".length);

  let userId: string;
  try {
    userId = verifyAccessToken(token).sub;
  } catch {
    throw AppError.unauthorized("Invalid or expired access token");
  }

  const user = await loadRequestUser(userId);
  if (!user) {
    throw AppError.unauthorized("Account is inactive or no longer exists");
  }

  req.user = user;
  next();
});
