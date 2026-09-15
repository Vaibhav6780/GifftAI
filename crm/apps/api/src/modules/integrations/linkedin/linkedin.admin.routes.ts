import { Router } from "express";
import multer from "multer";
import { linkedinOAuth } from "./linkedin.oauth";
import { linkedinCsvImportController } from "./linkedin.csv-import.controller";
import { requirePermission } from "../../../middleware/rbac.middleware";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

/** Mounted under /api/integrations/linkedin in integrations-admin.routes.ts (already
 *  behind requireAuth there). OAuth *callback* is public (see linkedin.oauth.ts). */
export const linkedinAdminRouter = Router();

linkedinAdminRouter.get("/oauth/start", requirePermission("settings:manage_integrations"), linkedinOAuth.start);
linkedinAdminRouter.post(
  "/import",
  requirePermission("settings:manage_integrations"),
  upload.single("file"),
  linkedinCsvImportController.import,
);
