import type { Request, Response } from "express";
import type {
  ApiResponse,
  CreateAttendanceRequestInput,
  ExportAttendanceRequestsQuery,
  ListAttendanceRequestsQuery,
  ListMyAttendanceRequestsQuery,
  ReviewAttendanceRequestInput,
} from "@gifftai/shared";
import { attendanceRequestsService } from "./attendanceRequests.service";
import { buildAttendanceRequestsWorkbook } from "./attendanceRequests.export";
import { asyncHandler } from "../../lib/asyncHandler";
import { requestMeta } from "../../lib/requestMeta";

export const attendanceRequestsController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as CreateAttendanceRequestInput;
    const request = await attendanceRequestsService.create(req.user!.id, input, requestMeta(req));
    const body: ApiResponse<typeof request> = { success: true, data: request };
    res.status(201).json(body);
  }),

  listOwn: asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as ListMyAttendanceRequestsQuery;
    const result = await attendanceRequestsService.listOwn(req.user!.id, query);
    const body: ApiResponse<typeof result> = { success: true, data: result };
    res.status(200).json(body);
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as ListAttendanceRequestsQuery;
    const result = await attendanceRequestsService.list(query);
    const body: ApiResponse<typeof result> = { success: true, data: result };
    res.status(200).json(body);
  }),

  export: asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as ExportAttendanceRequestsQuery;
    const requests = await attendanceRequestsService.exportList(query);
    const buffer = await buildAttendanceRequestsWorkbook(requests);

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="wfh-leave-requests-export-${Date.now()}.xlsx"`);
    res.status(200).send(buffer);
  }),

  review: asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as ReviewAttendanceRequestInput;
    const request = await attendanceRequestsService.review(req.params.id!, req.user!.id, input, requestMeta(req));
    const body: ApiResponse<typeof request> = { success: true, data: request };
    res.status(200).json(body);
  }),
};
