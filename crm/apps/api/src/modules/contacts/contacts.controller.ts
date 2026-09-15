import type { Request, Response } from "express";
import type { ApiResponse, CreateContactInput, ListContactsQuery, UpdateContactInput } from "@gifftai/shared";
import { contactsService } from "./contacts.service";
import { asyncHandler } from "../../lib/asyncHandler";
import { requestMeta } from "../../lib/requestMeta";

export const contactsController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as ListContactsQuery;
    const contacts = await contactsService.list(query);
    const body: ApiResponse<typeof contacts> = { success: true, data: contacts };
    res.status(200).json(body);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const contact = await contactsService.getById(req.params.id!);
    const body: ApiResponse<typeof contact> = { success: true, data: contact };
    res.status(200).json(body);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as CreateContactInput;
    const contact = await contactsService.create(input, req.user!.id, requestMeta(req));
    const body: ApiResponse<typeof contact> = { success: true, data: contact };
    res.status(201).json(body);
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as UpdateContactInput;
    const contact = await contactsService.update(req.params.id!, input, req.user!.id, requestMeta(req));
    const body: ApiResponse<typeof contact> = { success: true, data: contact };
    res.status(200).json(body);
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await contactsService.remove(req.params.id!, req.user!.id, requestMeta(req));
    const body: ApiResponse<null> = { success: true, data: null };
    res.status(200).json(body);
  }),
};
