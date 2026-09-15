import multer, { MulterError } from "multer";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { AppError } from "./apiError";

/** PDF plus the usual office-document/image types support tickets show up with. */
export const ALLOWED_ATTACHMENT_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
]);

const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_ATTACHMENTS_PER_UPLOAD = 5;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_ATTACHMENT_SIZE_BYTES, files: MAX_ATTACHMENTS_PER_UPLOAD },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_ATTACHMENT_MIME_TYPES.has(file.mimetype)) {
      cb(AppError.badRequest(`Unsupported file type: ${file.mimetype}. Allowed: PDF, images, Word/Excel, plain text.`));
      return;
    }
    cb(null, true);
  },
});

/**
 * Wraps multer's `.array()` so a size/count-limit failure (a `MulterError`, which multer
 * would otherwise hand to Express's default error path) surfaces as a normal `AppError`
 * 400 through the app's usual error-response shape, same as every other validation failure.
 * A no-op for plain JSON requests (multer only engages for multipart/form-data), so routes
 * using this stay backward-compatible with callers that never send a file.
 */
export function attachmentUploadArray(fieldName: string, maxCount = MAX_ATTACHMENTS_PER_UPLOAD): RequestHandler {
  const middleware = upload.array(fieldName, maxCount);
  return (req: Request, res: Response, next: NextFunction) => {
    middleware(req, res, (err: unknown) => {
      if (!err) return next();
      if (err instanceof MulterError) return next(AppError.badRequest(err.message));
      next(err);
    });
  };
}
