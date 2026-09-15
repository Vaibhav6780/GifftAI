import type { Request, Response } from "express";
import type { ApiResponse, ExportAttendanceQuery, ListAttendanceQuery } from "@gifftai/shared";
import { attendanceService } from "./attendance.service";
import { buildAttendanceWorkbook } from "./attendance.export";
import { asyncHandler } from "../../lib/asyncHandler";
import { requestMeta } from "../../lib/requestMeta";

export const attendanceController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as ListAttendanceQuery;
    const result = await attendanceService.list(query);
    const body: ApiResponse<typeof result> = { success: true, data: result };
    res.status(200).json(body);
  }),

  export: asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as ExportAttendanceQuery;
    const sessions = await attendanceService.exportList(query);
    const buffer = await buildAttendanceWorkbook(sessions);

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="attendance-export-${Date.now()}.xlsx"`);
    res.status(200).send(buffer);
  }),

  me: asyncHandler(async (req: Request, res: Response) => {
    const status = await attendanceService.me(req.user!.id);
    const body: ApiResponse<typeof status> = { success: true, data: status };
    res.status(200).json(body);
  }),

  goOnline: asyncHandler(async (req: Request, res: Response) => {
    const status = await attendanceService.goOnline(req.user!.id, requestMeta(req));
    const body: ApiResponse<typeof status> = { success: true, data: status };
    res.status(200).json(body);
  }),

  goOffline: asyncHandler(async (req: Request, res: Response) => {
    const status = await attendanceService.goOffline(req.user!.id);
    const body: ApiResponse<typeof status> = { success: true, data: status };
    res.status(200).json(body);
  }),

  extendOvertime: asyncHandler(async (req: Request, res: Response) => {
    const status = await attendanceService.extendOvertime(req.user!.id, requestMeta(req));
    const body: ApiResponse<typeof status> = { success: true, data: status };
    res.status(200).json(body);
  }),
};
