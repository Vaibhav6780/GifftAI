import type { Request, Response } from "express";
import type { ApiResponse, ListDailyReportsQuery, ListMyDailyReportsQuery, SubmitDailyReportInput } from "@gifftai/shared";
import { dailyReportsService } from "./dailyReports.service";
import { asyncHandler } from "../../lib/asyncHandler";
import { requestMeta } from "../../lib/requestMeta";

export const dailyReportsController = {
  submitToday: asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as SubmitDailyReportInput;
    const report = await dailyReportsService.submitToday(req.user!.id, input, requestMeta(req));
    const body: ApiResponse<typeof report> = { success: true, data: report };
    res.status(200).json(body);
  }),

  listOwn: asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as ListMyDailyReportsQuery;
    const result = await dailyReportsService.listOwn(req.user!.id, query);
    const body: ApiResponse<typeof result> = { success: true, data: result };
    res.status(200).json(body);
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as ListDailyReportsQuery;
    const result = await dailyReportsService.list(query);
    const body: ApiResponse<typeof result> = { success: true, data: result };
    res.status(200).json(body);
  }),
};
