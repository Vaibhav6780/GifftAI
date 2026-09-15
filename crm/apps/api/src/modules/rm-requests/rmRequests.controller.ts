import type { Request, Response } from "express";
import type {
  ApiResponse,
  AssignRmUserInput,
  ListRmFundingRequestsQuery,
  ListRmManualRequestsQuery,
  RejectRmFundingRequestInput,
  RmRequestsConnectionStatus,
  SetRmManualRequestStatusInput,
} from "@gifftai/shared";
import { rmRequestsService } from "./rmRequests.service";
import { asyncHandler } from "../../lib/asyncHandler";

export const rmRequestsController = {
  status: asyncHandler(async (_req: Request, res: Response) => {
    const data: RmRequestsConnectionStatus = { connected: rmRequestsService.isConfigured() };
    const body: ApiResponse<typeof data> = { success: true, data };
    res.status(200).json(body);
  }),

  listFundingRequests: asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as ListRmFundingRequestsQuery;
    const rows = await rmRequestsService.listFundingRequests(req.user!.email, query.status);
    const body: ApiResponse<typeof rows> = { success: true, data: rows };
    res.status(200).json(body);
  }),

  approveFundingRequest: asyncHandler(async (req: Request, res: Response) => {
    const result = await rmRequestsService.approveFundingRequest(req.user!.email, req.params.id!);
    const body: ApiResponse<typeof result> = { success: true, data: result };
    res.status(200).json(body);
  }),

  creditFundingRequest: asyncHandler(async (req: Request, res: Response) => {
    const result = await rmRequestsService.creditFundingRequest(req.user!.email, req.params.id!);
    const body: ApiResponse<typeof result> = { success: true, data: result };
    res.status(200).json(body);
  }),

  rejectFundingRequest: asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as RejectRmFundingRequestInput;
    const result = await rmRequestsService.rejectFundingRequest(req.user!.email, req.params.id!, input.reason);
    const body: ApiResponse<typeof result> = { success: true, data: result };
    res.status(200).json(body);
  }),

  fundingProof: asyncHandler(async (req: Request, res: Response) => {
    const file = await rmRequestsService.getFundingProof(req.user!.email, req.params.id!);
    res.setHeader("Content-Type", file.contentType);
    res.setHeader("Content-Disposition", `inline; filename="${file.fileName}"`);
    res.status(200).send(file.buffer);
  }),

  listManualRequests: asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as ListRmManualRequestsQuery;
    const rows = await rmRequestsService.listManualRequests(req.user!.email, query.status);
    const body: ApiResponse<typeof rows> = { success: true, data: rows };
    res.status(200).json(body);
  }),

  setManualRequestStatus: asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as SetRmManualRequestStatusInput;
    const result = await rmRequestsService.setManualRequestStatus(req.user!.email, req.params.id!, input.status);
    const body: ApiResponse<typeof result> = { success: true, data: result };
    res.status(200).json(body);
  }),

  listRms: asyncHandler(async (req: Request, res: Response) => {
    const rows = await rmRequestsService.listRms(req.user!.email);
    const body: ApiResponse<typeof rows> = { success: true, data: rows };
    res.status(200).json(body);
  }),

  assignUserToRm: asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as AssignRmUserInput;
    const result = await rmRequestsService.assignUserToRm(req.user!.email, req.params.userId!, input.rmId);
    const body: ApiResponse<typeof result> = { success: true, data: result };
    res.status(200).json(body);
  }),
};
