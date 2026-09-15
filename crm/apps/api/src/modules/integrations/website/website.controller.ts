import type { Request, Response } from "express";
import type { ApiResponse, WebsiteContactFormInput, WebsiteSupportTicketInput } from "@gifftai/shared";
import { websiteService } from "./website.service";
import { asyncHandler } from "../../../lib/asyncHandler";
import { requestMeta } from "../../../lib/requestMeta";

export const websiteController = {
  submitContactForm: asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as WebsiteContactFormInput;
    await websiteService.submitContactForm(input);

    // Public endpoint — never echo back internal Lead/CRM details to an anonymous visitor.
    const body: ApiResponse<{ received: true }> = { success: true, data: { received: true } };
    res.status(201).json(body);
  }),

  submitSupportTicket: asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as WebsiteSupportTicketInput;
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    await websiteService.submitSupportTicket(input, files, requestMeta(req));

    // Public endpoint — never echo back internal Ticket/CRM details to an anonymous visitor.
    const body: ApiResponse<{ received: true }> = { success: true, data: { received: true } };
    res.status(201).json(body);
  }),
};
