import { Router } from "express";
import { listDailyReportsQuerySchema, listMyDailyReportsQuerySchema, submitDailyReportSchema } from "@gifftai/shared";
import { dailyReportsController } from "./dailyReports.controller";
import { validate } from "../../middleware/validate.middleware";
import { requireAuth } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/rbac.middleware";

export const dailyReportsRouter = Router();

dailyReportsRouter.use(requireAuth);

// Submitting/viewing your own Day Report needs no permission — every employee can, same as
// GET /auth/me and the Attendance Requests own-submission routes. Only viewing everyone's
// reports is gated.
dailyReportsRouter.put("/today", validate(submitDailyReportSchema), dailyReportsController.submitToday);
dailyReportsRouter.get(
  "/me",
  validate(listMyDailyReportsQuerySchema, "query"),
  dailyReportsController.listOwn,
);

dailyReportsRouter.get(
  "/",
  requirePermission("daily_reports:read"),
  validate(listDailyReportsQuerySchema, "query"),
  dailyReportsController.list,
);
