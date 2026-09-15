import type { Request, Response } from "express";
import type { ApiResponse, WhatsappConnectInput, WhatsappInboxQuery, WhatsappReplyInput } from "@gifftai/shared";
import { whatsappAdminService } from "./whatsapp.admin.service";
import { asyncHandler } from "../../../lib/asyncHandler";

export const whatsappAdminController = {
  connect: asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as WhatsappConnectInput;
    const result = await whatsappAdminService.connect(input, req.user!.id);
    const body: ApiResponse<typeof result> = { success: true, data: result };
    res.status(200).json(body);
  }),

  testConnection: asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as WhatsappConnectInput;
    const result = await whatsappAdminService.testConnection(input);
    const body: ApiResponse<typeof result> = { success: true, data: result };
    res.status(200).json(body);
  }),

  syncContacts: asyncHandler(async (_req: Request, res: Response) => {
    const result = await whatsappAdminService.syncContacts();
    const body: ApiResponse<typeof result> = { success: true, data: result };
    res.status(200).json(body);
  }),

  syncConversation: asyncHandler(async (req: Request, res: Response) => {
    const result = await whatsappAdminService.syncConversation(req.params.leadId!);
    const body: ApiResponse<typeof result> = { success: true, data: result };
    res.status(200).json(body);
  }),

  startHistoryImport: asyncHandler(async (_req: Request, res: Response) => {
    await whatsappAdminService.startHistoryImport();
    const body: ApiResponse<{ status: "queued" }> = { success: true, data: { status: "queued" } };
    res.status(202).json(body);
  }),

  getHistoryImportStatus: asyncHandler(async (_req: Request, res: Response) => {
    const result = await whatsappAdminService.getHistoryImportStatus();
    const body: ApiResponse<typeof result> = { success: true, data: result };
    res.status(200).json(body);
  }),

  listInbox: asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as WhatsappInboxQuery;
    const result = await whatsappAdminService.listInbox(query);
    const body: ApiResponse<typeof result> = { success: true, data: result };
    res.status(200).json(body);
  }),

  reply: asyncHandler(async (req: Request, res: Response) => {
    const { message } = req.body as WhatsappReplyInput;
    await whatsappAdminService.sendReply(req.params.leadId!, message, req.user!.id);
    const body: ApiResponse<null> = { success: true, data: null };
    res.status(200).json(body);
  }),
};
