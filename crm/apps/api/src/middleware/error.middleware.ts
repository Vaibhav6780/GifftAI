import type { NextFunction, Request, Response } from "express";
import type { ApiErrorResponse } from "@gifftai/shared";
import { AppError } from "../lib/apiError";
import { logger } from "../config/logger";

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(AppError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const appError =
    err instanceof AppError
      ? err
      : new AppError(500, "INTERNAL_ERROR", err instanceof Error ? err.message : "Unexpected error");

  if (appError.statusCode >= 500) {
    logger.error({ err, requestId: req.id }, "Unhandled error");
  } else {
    logger.warn({ requestId: req.id, code: appError.code }, appError.message);
  }

  const body: ApiErrorResponse = {
    success: false,
    error: {
      message: appError.message,
      code: appError.code,
      ...(appError.details !== undefined ? { details: appError.details } : {}),
    },
  };

  res.status(appError.statusCode).json(body);
}
