import type { Request, Response } from "express";
import type { ApiResponse, TelegramConnectInput, TelegramInboxQuery, TelegramReplyInput } from "@gifftai/shared";
import { telegramAdminService } from "./telegram.admin.service";
import { asyncHandler } from "../../../lib/asyncHandler";

export const telegramAdminController = {
  connect: asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as TelegramConnectInput;
    const result = await telegramAdminService.connect(input, req.user!.id);
    const body: ApiResponse<typeof result> = { success: true, data: result };
    res.status(200).json(body);
  }),

  setWebhook: asyncHandler(async (_req: Request, res: Response) => {
    await telegramAdminService.setWebhookNow();
    const body: ApiResponse<{ registered: true }> = { success: true, data: { registered: true } };
    res.status(200).json(body);
  }),

  listInbox: asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as TelegramInboxQuery;
    const result = await telegramAdminService.listInbox(query);
    const body: ApiResponse<typeof result> = { success: true, data: result };
    res.status(200).json(body);
  }),

  reply: asyncHandler(async (req: Request, res: Response) => {
    const { message } = req.body as TelegramReplyInput;
    await telegramAdminService.sendReply(req.params.leadId!, message, req.user!.id);
    const body: ApiResponse<null> = { success: true, data: null };
    res.status(200).json(body);
  }),
};
