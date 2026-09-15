import type { Request, Response } from "express";
import type { ApiResponse, MailComposeInput, MailConnectInput, MailInboxQuery, MailReplyInput, MailSentQuery } from "@gifftai/shared";
import { hostingerMailAdminService } from "./hostingerMail.admin.service";
import { asyncHandler } from "../../../lib/asyncHandler";

export const hostingerMailAdminController = {
  connect: asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as MailConnectInput;
    const result = await hostingerMailAdminService.connect(input, req.user!.id);
    const body: ApiResponse<typeof result> = { success: true, data: result };
    res.status(200).json(body);
  }),

  testConnection: asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as MailConnectInput;
    const result = await hostingerMailAdminService.testConnection(input);
    const body: ApiResponse<typeof result> = { success: true, data: result };
    res.status(200).json(body);
  }),

  listInbox: asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as MailInboxQuery;
    const result = await hostingerMailAdminService.listInbox(query);
    const body: ApiResponse<typeof result> = { success: true, data: result };
    res.status(200).json(body);
  }),

  listConversationMessages: asyncHandler(async (req: Request, res: Response) => {
    const result = await hostingerMailAdminService.listConversationMessages(req.params.conversationId!);
    const body: ApiResponse<typeof result> = { success: true, data: result };
    res.status(200).json(body);
  }),

  markRead: asyncHandler(async (req: Request, res: Response) => {
    await hostingerMailAdminService.markConversationRead(req.params.conversationId!);
    const body: ApiResponse<null> = { success: true, data: null };
    res.status(200).json(body);
  }),

  reply: asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as MailReplyInput;
    await hostingerMailAdminService.reply(req.params.conversationId!, input, req.user!.id);
    const body: ApiResponse<null> = { success: true, data: null };
    res.status(200).json(body);
  }),

  compose: asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as MailComposeInput;
    const result = await hostingerMailAdminService.compose(input, req.user!.id);
    const body: ApiResponse<typeof result> = { success: true, data: result };
    res.status(201).json(body);
  }),

  listSent: asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as MailSentQuery;
    const result = await hostingerMailAdminService.listSent(query);
    const body: ApiResponse<typeof result> = { success: true, data: result };
    res.status(200).json(body);
  }),
};
