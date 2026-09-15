import type { Request, Response } from "express";
import type { ApiResponse } from "@gifftai/shared";
import { dashboardService } from "./dashboard.service";
import { asyncHandler } from "../../lib/asyncHandler";

export const dashboardController = {
  getSummary: asyncHandler(async (req: Request, res: Response) => {
    const summary = await dashboardService.getSummary(req.user!.id);
    const body: ApiResponse<typeof summary> = { success: true, data: summary };
    res.status(200).json(body);
  }),
};
