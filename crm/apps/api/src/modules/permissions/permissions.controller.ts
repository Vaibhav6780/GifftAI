import type { Request, Response } from "express";
import type { ApiResponse } from "@gifftai/shared";
import { permissionsService } from "./permissions.service";
import { asyncHandler } from "../../lib/asyncHandler";

export const permissionsController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    const groups = await permissionsService.listCatalog();
    const body: ApiResponse<typeof groups> = { success: true, data: groups };
    res.status(200).json(body);
  }),
};
