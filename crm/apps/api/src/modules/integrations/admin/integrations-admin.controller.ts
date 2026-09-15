import type { Request, Response } from "express";
import type { ApiResponse, IntegrationChannelType } from "@gifftai/shared";
import { integrationsAdminService } from "./integrations-admin.service";
import { asyncHandler } from "../../../lib/asyncHandler";

export const integrationsAdminController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    const items = await integrationsAdminService.list();
    const body: ApiResponse<typeof items> = { success: true, data: items };
    res.status(200).json(body);
  }),

  getByChannelType: asyncHandler(async (req: Request, res: Response) => {
    const channelType = req.params.channelType as IntegrationChannelType;
    const item = await integrationsAdminService.getByChannelType(channelType);
    const body: ApiResponse<typeof item> = { success: true, data: item };
    res.status(200).json(body);
  }),

  disconnect: asyncHandler(async (req: Request, res: Response) => {
    const channelType = req.params.channelType as IntegrationChannelType;
    await integrationsAdminService.disconnect(channelType);
    const body: ApiResponse<null> = { success: true, data: null };
    res.status(200).json(body);
  }),

  resync: asyncHandler(async (req: Request, res: Response) => {
    const channelType = req.params.channelType as IntegrationChannelType;
    const result = await integrationsAdminService.resync(channelType);
    const body: ApiResponse<typeof result> = { success: true, data: result };
    res.status(200).json(body);
  }),
};
