import type { Request, Response } from "express";
import type {
  ApiResponse,
  AssignTicketInput,
  CreateTicketInput,
  ListTicketsQuery,
  UpdateTicketInput,
} from "@gifftai/shared";
import { ticketsService } from "./tickets.service";
import { AppError } from "../../lib/apiError";
import { asyncHandler } from "../../lib/asyncHandler";
import { requestMeta } from "../../lib/requestMeta";

export const ticketsController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as ListTicketsQuery;
    const tickets = await ticketsService.list(query);
    const body: ApiResponse<typeof tickets> = { success: true, data: tickets };
    res.status(200).json(body);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const ticket = await ticketsService.getById(req.params.id!);
    const body: ApiResponse<typeof ticket> = { success: true, data: ticket };
    res.status(200).json(body);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as CreateTicketInput;
    const ticket = await ticketsService.create(input, req.user!.id, requestMeta(req));
    const body: ApiResponse<typeof ticket> = { success: true, data: ticket };
    res.status(201).json(body);
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as UpdateTicketInput;
    const ticket = await ticketsService.update(req.params.id!, input, req.user!.id, requestMeta(req));
    const body: ApiResponse<typeof ticket> = { success: true, data: ticket };
    res.status(200).json(body);
  }),

  assign: asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as AssignTicketInput;
    const ticket = await ticketsService.assign(req.params.id!, input, req.user!.id, requestMeta(req));
    const body: ApiResponse<typeof ticket> = { success: true, data: ticket };
    res.status(200).json(body);
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await ticketsService.remove(req.params.id!, req.user!.id, requestMeta(req));
    const body: ApiResponse<null> = { success: true, data: null };
    res.status(200).json(body);
  }),

  listAttachments: asyncHandler(async (req: Request, res: Response) => {
    const attachments = await ticketsService.listAttachments(req.params.id!);
    const body: ApiResponse<typeof attachments> = { success: true, data: attachments };
    res.status(200).json(body);
  }),

  addAttachment: asyncHandler(async (req: Request, res: Response) => {
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (files.length === 0) throw AppError.badRequest("No file provided");

    const attachments = await Promise.all(
      files.map((file) =>
        ticketsService.addAttachment(
          req.params.id!,
          { buffer: file.buffer, fileName: file.originalname, mimeType: file.mimetype, size: file.size },
          req.user!.id,
          requestMeta(req),
        ),
      ),
    );
    const body: ApiResponse<typeof attachments> = { success: true, data: attachments };
    res.status(201).json(body);
  }),

  removeAttachment: asyncHandler(async (req: Request, res: Response) => {
    await ticketsService.removeAttachment(req.params.id!, req.params.attachmentId!, req.user!.id, requestMeta(req));
    const body: ApiResponse<null> = { success: true, data: null };
    res.status(200).json(body);
  }),
};
