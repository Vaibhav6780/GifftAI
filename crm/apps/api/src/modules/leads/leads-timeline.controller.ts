import type { Request, Response } from "express";
import type { ApiResponse } from "@gifftai/shared";
import { leadsTimelineService } from "./leads-timeline.service";
import { asyncHandler } from "../../lib/asyncHandler";

export const leadsTimelineController = {
  getTimeline: asyncHandler(async (req: Request, res: Response) => {
    const entries = await leadsTimelineService.getTimeline(req.params.id!);
    const body: ApiResponse<typeof entries> = { success: true, data: entries };
    res.status(200).json(body);
  }),
};
