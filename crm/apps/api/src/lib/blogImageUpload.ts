import multer, { MulterError } from "multer";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { AppError } from "./apiError";

/** Image types the gifftai blog upload endpoint accepts (blog_service.py `allowed`). */
const ALLOWED_IMAGE_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

// Matches the gifftai admin-api's own 8MB cap (blog_service.upload_blog_image).
const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_SIZE_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
      cb(
        AppError.badRequest(
          `Unsupported image type: ${file.mimetype}. Allowed: PNG, JPEG, WebP, GIF.`,
        ),
      );
      return;
    }
    cb(null, true);
  },
});

/**
 * Wraps multer's `.single()` so a size/type-limit failure surfaces as a normal AppError
 * 400 through the app's usual error-response shape, same pattern as attachmentUpload.ts.
 * The parsed file lands on `req.file`.
 */
export function blogImageUploadSingle(fieldName = "file"): RequestHandler {
  const middleware = upload.single(fieldName);
  return (req: Request, res: Response, next: NextFunction) => {
    middleware(req, res, (err: unknown) => {
      if (!err) return next();
      if (err instanceof MulterError) return next(AppError.badRequest(err.message));
      next(err);
    });
  };
}
