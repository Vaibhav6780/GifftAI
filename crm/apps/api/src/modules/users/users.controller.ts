import type { Request, Response } from "express";
import type {
  ApiResponse,
  CreateUserInput,
  ListUsersQuery,
  SetUserPasswordInput,
  SetUserRolesInput,
  UpdateUserInput,
  UpdateUserStatusInput,
} from "@gifftai/shared";
import { usersService } from "./users.service";
import { asyncHandler } from "../../lib/asyncHandler";
import { requestMeta } from "../../lib/requestMeta";

export const usersController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as ListUsersQuery;
    const result = await usersService.list(query);
    const body: ApiResponse<typeof result> = { success: true, data: result };
    res.status(200).json(body);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const user = await usersService.getById(req.params.id!);
    const body: ApiResponse<typeof user> = { success: true, data: user };
    res.status(200).json(body);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as CreateUserInput;
    const user = await usersService.create(input, req.user!.id, requestMeta(req));
    const body: ApiResponse<typeof user> = { success: true, data: user };
    res.status(201).json(body);
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as UpdateUserInput;
    const user = await usersService.update(req.params.id!, input, req.user!.id, requestMeta(req));
    const body: ApiResponse<typeof user> = { success: true, data: user };
    res.status(200).json(body);
  }),

  updateStatus: asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as UpdateUserStatusInput;
    const user = await usersService.updateStatus(req.params.id!, input, req.user!.id, requestMeta(req));
    const body: ApiResponse<typeof user> = { success: true, data: user };
    res.status(200).json(body);
  }),

  setRoles: asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as SetUserRolesInput;
    const user = await usersService.setRoles(req.params.id!, input, req.user!.id, requestMeta(req));
    const body: ApiResponse<typeof user> = { success: true, data: user };
    res.status(200).json(body);
  }),

  setPassword: asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as SetUserPasswordInput;
    const user = await usersService.setPassword(req.params.id!, input, req.user!.id, requestMeta(req));
    const body: ApiResponse<typeof user> = { success: true, data: user };
    res.status(200).json(body);
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    const user = await usersService.deactivate(req.params.id!, req.user!.id, requestMeta(req));
    const body: ApiResponse<typeof user> = { success: true, data: user };
    res.status(200).json(body);
  }),

  hardDelete: asyncHandler(async (req: Request, res: Response) => {
    await usersService.hardDelete(req.params.id!, req.user!.id, requestMeta(req));
    const body: ApiResponse<null> = { success: true, data: null };
    res.status(200).json(body);
  }),

  resendWelcome: asyncHandler(async (req: Request, res: Response) => {
    await usersService.resendWelcome(req.params.id!, req.user!.id, requestMeta(req));
    const body: ApiResponse<null> = { success: true, data: null };
    res.status(200).json(body);
  }),
};
