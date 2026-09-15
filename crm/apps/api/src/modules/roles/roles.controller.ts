import type { Request, Response } from "express";
import type { ApiResponse, CreateRoleInput, SetRolePermissionsInput, UpdateRoleInput } from "@gifftai/shared";
import { rolesService } from "./roles.service";
import { asyncHandler } from "../../lib/asyncHandler";
import { requestMeta } from "../../lib/requestMeta";

export const rolesController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    const roles = await rolesService.list();
    const body: ApiResponse<typeof roles> = { success: true, data: roles };
    res.status(200).json(body);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const role = await rolesService.getById(req.params.id!);
    const body: ApiResponse<typeof role> = { success: true, data: role };
    res.status(200).json(body);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as CreateRoleInput;
    const role = await rolesService.create(input, req.user!.id, requestMeta(req));
    const body: ApiResponse<typeof role> = { success: true, data: role };
    res.status(201).json(body);
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as UpdateRoleInput;
    const role = await rolesService.update(req.params.id!, input, req.user!.id, requestMeta(req));
    const body: ApiResponse<typeof role> = { success: true, data: role };
    res.status(200).json(body);
  }),

  setPermissions: asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as SetRolePermissionsInput;
    const role = await rolesService.setPermissions(
      req.params.id!,
      input,
      { id: req.user!.id, roles: req.user!.roles },
      requestMeta(req),
    );
    const body: ApiResponse<typeof role> = { success: true, data: role };
    res.status(200).json(body);
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await rolesService.remove(req.params.id!, req.user!.id, requestMeta(req));
    const body: ApiResponse<null> = { success: true, data: null };
    res.status(200).json(body);
  }),
};
