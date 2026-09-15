import { Router } from "express";
import {
  createAttendanceRequestSchema,
  exportAttendanceRequestsQuerySchema,
  listAttendanceRequestsQuerySchema,
  listMyAttendanceRequestsQuerySchema,
  reviewAttendanceRequestSchema,
} from "@gifftai/shared";
import { attendanceRequestsController } from "./attendanceRequests.controller";
import { validate } from "../../middleware/validate.middleware";
import { requireAuth } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/rbac.middleware";

export const attendanceRequestsRouter = Router();

attendanceRequestsRouter.use(requireAuth);

// Submitting/viewing your own requests needs no permission — every employee can, same as
// GET /auth/me. Only viewing everyone's requests and approving/rejecting is gated.
attendanceRequestsRouter.post("/", validate(createAttendanceRequestSchema), attendanceRequestsController.create);
attendanceRequestsRouter.get(
  "/me",
  validate(listMyAttendanceRequestsQuerySchema, "query"),
  attendanceRequestsController.listOwn,
);

attendanceRequestsRouter.get(
  "/",
  requirePermission("attendance_requests:approve"),
  validate(listAttendanceRequestsQuerySchema, "query"),
  attendanceRequestsController.list,
);
attendanceRequestsRouter.get(
  "/export",
  requirePermission("attendance_requests:approve"),
  validate(exportAttendanceRequestsQuerySchema, "query"),
  attendanceRequestsController.export,
);
attendanceRequestsRouter.patch(
  "/:id/review",
  requirePermission("attendance_requests:approve"),
  validate(reviewAttendanceRequestSchema),
  attendanceRequestsController.review,
);
