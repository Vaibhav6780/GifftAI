import { Router } from "express";
import { instagramOAuth } from "./instagram.oauth";
import { requirePermission } from "../../../middleware/rbac.middleware";

/** Mounted under /api/integrations/instagram in integrations-admin.routes.ts (already
 *  behind requireAuth there). Only the OAuth *start* lives here — the callback is public
 *  (see instagram.routes.ts) since Meta redirects the browser with no auth header. */
export const instagramAdminRouter = Router();

instagramAdminRouter.get("/oauth/start", requirePermission("settings:manage_integrations"), instagramOAuth.start);
