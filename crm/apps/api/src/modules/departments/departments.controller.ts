import type { Request, Response } from "express";
import type { ApiResponse, CreateDepartmentInput, UpdateDepartmentInput } from "@gifftai/shared";
import { departmentsService } from "./departments.service";
import { asyncHandler } from "../../lib/asyncHandler";
import { requestMeta } from "../../lib/requestMeta";

export const departmentsController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    const departments = await departmentsService.list();
    const body: ApiResponse<typeof departments> = { success: true, data: departments };
    res.status(200).json(body);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const department = await departmentsService.getById(req.params.id!);
    const body: ApiResponse<typeof department> = { success: true, data: department };
    res.status(200).json(body);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as CreateDepartmentInput;
    const department = await departmentsService.create(input, req.user!.id, requestMeta(req));
    const body: ApiResponse<typeof department> = { success: true, data: department };
    res.status(201).json(body);
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as UpdateDepartmentInput;
    const department = await departmentsService.update(req.params.id!, input, req.user!.id, requestMeta(req));
    const body: ApiResponse<typeof department> = { success: true, data: department };
    res.status(200).json(body);
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await departmentsService.remove(req.params.id!, req.user!.id, requestMeta(req));
    const body: ApiResponse<null> = { success: true, data: null };
    res.status(200).json(body);
  }),
};
