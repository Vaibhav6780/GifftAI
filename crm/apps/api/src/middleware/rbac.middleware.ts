import type { NextFunction, Request, Response } from "express";
import type { PermissionKey } from "@gifftai/shared";
import { AppError } from "../lib/apiError";

export function requirePermission(...allowed: PermissionKey[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(AppError.unauthorized());
      return;
    }
    const hasPermission = allowed.some((key) => req.user?.permissions.includes(key));
    if (!hasPermission) {
      next(AppError.forbidden());
      return;
    }
    next();
  };
}
