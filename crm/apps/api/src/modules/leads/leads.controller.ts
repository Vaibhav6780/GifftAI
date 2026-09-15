import type { Request, Response } from "express";
import type {
  ApiResponse,
  AssignLeadInput,
  BulkAssignLeadsInput,
  ContactedLeadsQuery,
  CreateLeadInput,
  CreateLeadNoteInput,
  ExportLeadsQuery,
  LeadsStatsQuery,
  ListLeadFollowupsQuery,
  ListLeadsQuery,
  MarkLeadContactedInput,
  UpdateLeadInput,
} from "@gifftai/shared";
import { leadsService } from "./leads.service";
import { buildLeadsWorkbook } from "./leads.export";
import { asyncHandler } from "../../lib/asyncHandler";
import { requestMeta } from "../../lib/requestMeta";

export const leadsController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as ListLeadsQuery;
    const leads = await leadsService.list(query);
    const body: ApiResponse<typeof leads> = { success: true, data: leads };
    res.status(200).json(body);
  }),

  export: asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as ExportLeadsQuery;
    const leads = await leadsService.exportList(query);
    const buffer = await buildLeadsWorkbook(leads);

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="leads-export-${Date.now()}.xlsx"`);
    res.status(200).send(buffer);
  }),

  stats: asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as LeadsStatsQuery;
    const counts = await leadsService.getStatusCounts(query);
    const body: ApiResponse<typeof counts> = { success: true, data: counts };
    res.status(200).json(body);
  }),

  contacted: asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as ContactedLeadsQuery;
    const leads = await leadsService.listContacted(query);
    const body: ApiResponse<typeof leads> = { success: true, data: leads };
    res.status(200).json(body);
  }),

  followups: asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as ListLeadFollowupsQuery;
    const leads = await leadsService.listFollowups(query);
    const body: ApiResponse<typeof leads> = { success: true, data: leads };
    res.status(200).json(body);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const lead = await leadsService.getById(req.params.id!);
    const body: ApiResponse<typeof lead> = { success: true, data: lead };
    res.status(200).json(body);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as CreateLeadInput;
    const lead = await leadsService.create(input, req.user!.id, requestMeta(req));
    const body: ApiResponse<typeof lead> = { success: true, data: lead };
    res.status(201).json(body);
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as UpdateLeadInput;
    const lead = await leadsService.update(req.params.id!, input, req.user!, requestMeta(req));
    const body: ApiResponse<typeof lead> = { success: true, data: lead };
    res.status(200).json(body);
  }),

  assign: asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as AssignLeadInput;
    const lead = await leadsService.assign(req.params.id!, input, req.user!.id, requestMeta(req));
    const body: ApiResponse<typeof lead> = { success: true, data: lead };
    res.status(200).json(body);
  }),

  markContacted: asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as MarkLeadContactedInput;
    const lead = await leadsService.markContacted(req.params.id!, input, req.user!, requestMeta(req));
    const body: ApiResponse<typeof lead> = { success: true, data: lead };
    res.status(200).json(body);
  }),

  bulkAssign: asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as BulkAssignLeadsInput;
    const result = await leadsService.bulkAssign(input, req.user!.id, requestMeta(req));
    const body: ApiResponse<typeof result> = { success: true, data: result };
    res.status(200).json(body);
  }),

  listNotes: asyncHandler(async (req: Request, res: Response) => {
    const notes = await leadsService.listNotes(req.params.id!);
    const body: ApiResponse<typeof notes> = { success: true, data: notes };
    res.status(200).json(body);
  }),

  getActivity: asyncHandler(async (req: Request, res: Response) => {
    const entries = await leadsService.getActivity(req.params.id!);
    const body: ApiResponse<typeof entries> = { success: true, data: entries };
    res.status(200).json(body);
  }),

  addNote: asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as CreateLeadNoteInput;
    const note = await leadsService.addNote(req.params.id!, input, req.user!, requestMeta(req));
    const body: ApiResponse<typeof note> = { success: true, data: note };
    res.status(201).json(body);
  }),

  updateNote: asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as CreateLeadNoteInput;
    const note = await leadsService.updateNote(req.params.id!, req.params.noteId!, input, req.user!, requestMeta(req));
    const body: ApiResponse<typeof note> = { success: true, data: note };
    res.status(200).json(body);
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await leadsService.remove(req.params.id!, req.user!.id, requestMeta(req));
    const body: ApiResponse<null> = { success: true, data: null };
    res.status(200).json(body);
  }),

  convert: asyncHandler(async (req: Request, res: Response) => {
    const lead = await leadsService.convert(req.params.id!, req.user!.id, requestMeta(req));
    const body: ApiResponse<typeof lead> = { success: true, data: lead };
    res.status(200).json(body);
  }),
};
