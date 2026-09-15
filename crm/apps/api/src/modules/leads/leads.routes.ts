import { Router } from "express";
import {
  assignLeadSchema,
  bulkAssignLeadsSchema,
  contactedLeadsQuerySchema,
  createLeadNoteSchema,
  createLeadSchema,
  exportLeadsQuerySchema,
  leadsStatsQuerySchema,
  listLeadFollowupsQuerySchema,
  listLeadsQuerySchema,
  markLeadContactedSchema,
  updateLeadSchema,
} from "@gifftai/shared";
import { leadsController } from "./leads.controller";
import { leadsTimelineController } from "./leads-timeline.controller";
import { validate } from "../../middleware/validate.middleware";
import { requireAuth } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/rbac.middleware";

export const leadsRouter = Router();

leadsRouter.use(requireAuth);

leadsRouter.get(
  "/",
  requirePermission("leads:read"),
  validate(listLeadsQuerySchema, "query"),
  leadsController.list,
);
// Must be registered before the generic GET "/:id" below — Express would otherwise
// match "/export" as "/:id" with id="export" (single-segment routes match in
// registration order, not by literal-vs-param specificity).
leadsRouter.get(
  "/export",
  requirePermission("leads:export"),
  validate(exportLeadsQuerySchema, "query"),
  leadsController.export,
);
// Must be registered before the generic GET "/:id" below, same reason as "/export" above.
leadsRouter.get(
  "/stats",
  requirePermission("leads:read"),
  validate(leadsStatsQuerySchema, "query"),
  leadsController.stats,
);
// Must be registered before the generic GET "/:id" below, same reason as "/export" above.
leadsRouter.get(
  "/contacted",
  requirePermission("leads:read"),
  validate(contactedLeadsQuerySchema, "query"),
  leadsController.contacted,
);
// Must be registered before the generic GET "/:id" below, same reason as "/export" above.
leadsRouter.get(
  "/followups",
  requirePermission("leads:read"),
  validate(listLeadFollowupsQuerySchema, "query"),
  leadsController.followups,
);
leadsRouter.get("/:id", requirePermission("leads:read"), leadsController.getById);
leadsRouter.get("/:id/timeline", requirePermission("leads:read"), leadsTimelineController.getTimeline);
leadsRouter.get("/:id/notes", requirePermission("leads:read"), leadsController.listNotes);
leadsRouter.get("/:id/activity", requirePermission("leads:read"), leadsController.getActivity);
leadsRouter.post("/", requirePermission("leads:create"), validate(createLeadSchema), leadsController.create);
// Must be registered before the generic PATCH "/:id" below — Express would otherwise
// match "/bulk-assign" as "/:id" with id="bulk-assign" (single-segment routes match in
// registration order, not by literal-vs-param specificity).
leadsRouter.patch(
  "/bulk-assign",
  requirePermission("leads:assign"),
  validate(bulkAssignLeadsSchema),
  leadsController.bulkAssign,
);
leadsRouter.patch(
  "/:id",
  requirePermission("leads:update"),
  validate(updateLeadSchema),
  leadsController.update,
);
leadsRouter.patch(
  "/:id/assign",
  requirePermission("leads:assign"),
  validate(assignLeadSchema),
  leadsController.assign,
);
leadsRouter.patch(
  "/:id/contacted",
  requirePermission("leads:update"),
  validate(markLeadContactedSchema),
  leadsController.markContacted,
);
leadsRouter.post(
  "/:id/notes",
  requirePermission("leads:update"),
  validate(createLeadNoteSchema),
  leadsController.addNote,
);
leadsRouter.patch(
  "/:id/notes/:noteId",
  requirePermission("leads:update"),
  validate(createLeadNoteSchema),
  leadsController.updateNote,
);
leadsRouter.delete("/:id", requirePermission("leads:delete"), leadsController.remove);
leadsRouter.post("/:id/convert", requirePermission("leads:update"), leadsController.convert);
