import type { Request, Response } from "express";
import type { ApiResponse, ListAuditLogQuery } from "@gifftai/shared";
import { auditService } from "./audit.service";
import { asyncHandler } from "../../lib/asyncHandler";

export const auditController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as ListAuditLogQuery;
    const result = await auditService.list(query);
    const body: ApiResponse<typeof result> = { success: true, data: result };
    res.status(200).json(body);
  }),

  entityTypes: asyncHandler(async (_req: Request, res: Response) => {
    const result = await auditService.entityTypes();
    const body: ApiResponse<typeof result> = { success: true, data: result };
    res.status(200).json(body);
  }),
};
