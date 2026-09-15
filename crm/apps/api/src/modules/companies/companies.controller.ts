import type { Request, Response } from "express";
import type { ApiResponse, CreateCompanyInput, ListCompaniesQuery, UpdateCompanyInput } from "@gifftai/shared";
import { companiesService } from "./companies.service";
import { asyncHandler } from "../../lib/asyncHandler";
import { requestMeta } from "../../lib/requestMeta";

export const companiesController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as ListCompaniesQuery;
    const companies = await companiesService.list(query);
    const body: ApiResponse<typeof companies> = { success: true, data: companies };
    res.status(200).json(body);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const company = await companiesService.getById(req.params.id!);
    const body: ApiResponse<typeof company> = { success: true, data: company };
    res.status(200).json(body);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as CreateCompanyInput;
    const company = await companiesService.create(input, req.user!.id, requestMeta(req));
    const body: ApiResponse<typeof company> = { success: true, data: company };
    res.status(201).json(body);
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as UpdateCompanyInput;
    const company = await companiesService.update(req.params.id!, input, req.user!.id, requestMeta(req));
    const body: ApiResponse<typeof company> = { success: true, data: company };
    res.status(200).json(body);
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await companiesService.remove(req.params.id!, req.user!.id, requestMeta(req));
    const body: ApiResponse<null> = { success: true, data: null };
    res.status(200).json(body);
  }),
};
