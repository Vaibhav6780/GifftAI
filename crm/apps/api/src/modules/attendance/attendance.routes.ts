import { Router } from "express";
import { exportAttendanceQuerySchema, listAttendanceQuerySchema } from "@gifftai/shared";
import { attendanceController } from "./attendance.controller";
import { validate } from "../../middleware/validate.middleware";
import { requireAuth } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/rbac.middleware";

export const attendanceRouter = Router();

attendanceRouter.use(requireAuth);

attendanceRouter.get(
  "/",
  requirePermission("attendance:read"),
  validate(listAttendanceQuerySchema, "query"),
  attendanceController.list,
);
attendanceRouter.get(
  "/export",
  requirePermission("attendance:read"),
  validate(exportAttendanceQuerySchema, "query"),
  attendanceController.export,
);
attendanceRouter.get("/me", attendanceController.me);
attendanceRouter.post("/online", attendanceController.goOnline);
attendanceRouter.post("/offline", attendanceController.goOffline);
attendanceRouter.post("/extend-overtime", attendanceController.extendOvertime);
