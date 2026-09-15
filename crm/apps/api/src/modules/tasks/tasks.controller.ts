import type { Request, Response } from "express";
import type {
  ApiResponse,
  BulkCreateTasksInput,
  CreateTaskCommentInput,
  CreateTaskInput,
  ListTasksQuery,
  UpdateTaskInput,
} from "@gifftai/shared";
import { tasksService } from "./tasks.service";
import { asyncHandler } from "../../lib/asyncHandler";
import { requestMeta } from "../../lib/requestMeta";

export const tasksController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as ListTasksQuery;
    const tasks = await tasksService.list(query);
    const body: ApiResponse<typeof tasks> = { success: true, data: tasks };
    res.status(200).json(body);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const task = await tasksService.getById(req.params.id!);
    const body: ApiResponse<typeof task> = { success: true, data: task };
    res.status(200).json(body);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as CreateTaskInput;
    const task = await tasksService.create(input, req.user!.id, requestMeta(req));
    const body: ApiResponse<typeof task> = { success: true, data: task };
    res.status(201).json(body);
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as UpdateTaskInput;
    const task = await tasksService.update(req.params.id!, input, req.user!, requestMeta(req));
    const body: ApiResponse<typeof task> = { success: true, data: task };
    res.status(200).json(body);
  }),

  addComment: asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as CreateTaskCommentInput;
    const comment = await tasksService.addComment(req.params.id!, input, req.user!, requestMeta(req));
    const body: ApiResponse<typeof comment> = { success: true, data: comment };
    res.status(201).json(body);
  }),

  getActivity: asyncHandler(async (req: Request, res: Response) => {
    const entries = await tasksService.getActivity(req.params.id!);
    const body: ApiResponse<typeof entries> = { success: true, data: entries };
    res.status(200).json(body);
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await tasksService.remove(req.params.id!, req.user!.id, requestMeta(req));
    const body: ApiResponse<null> = { success: true, data: null };
    res.status(200).json(body);
  }),

  bulkAssign: asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as BulkCreateTasksInput;
    const tasks = await tasksService.bulkAssign(input, req.user!.id, requestMeta(req));
    const body: ApiResponse<typeof tasks> = { success: true, data: tasks };
    res.status(201).json(body);
  }),
};
