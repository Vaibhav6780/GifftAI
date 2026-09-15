import type { Request, Response } from "express";
import type { ApiResponse } from "@gifftai/shared";
import { leadSourcesService } from "./lead-sources.service";
import { asyncHandler } from "../../lib/asyncHandler";

export const leadSourcesController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    const sources = await leadSourcesService.list();
    const body: ApiResponse<typeof sources> = { success: true, data: sources };
    res.status(200).json(body);
  }),
};
