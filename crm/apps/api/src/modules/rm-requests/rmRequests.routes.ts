import { Router } from "express";
import {
  assignRmUserSchema,
  listRmFundingRequestsQuerySchema,
  listRmManualRequestsQuerySchema,
  rejectRmFundingRequestSchema,
  setRmManualRequestStatusSchema,
} from "@gifftai/shared";
import { rmRequestsController } from "./rmRequests.controller";
import { validate } from "../../middleware/validate.middleware";
import { requireAuth } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/rbac.middleware";

export const rmRequestsRouter = Router();

rmRequestsRouter.use(requireAuth);

rmRequestsRouter.get("/status", requirePermission("rm_requests:read"), rmRequestsController.status);

rmRequestsRouter.get(
  "/funding",
  requirePermission("rm_requests:read"),
  validate(listRmFundingRequestsQuerySchema, "query"),
  rmRequestsController.listFundingRequests,
);
rmRequestsRouter.get("/funding/:id/proof", requirePermission("rm_requests:read"), rmRequestsController.fundingProof);
rmRequestsRouter.post(
  "/funding/:id/approve",
  requirePermission("rm_requests:manage"),
  rmRequestsController.approveFundingRequest,
);
rmRequestsRouter.post(
  "/funding/:id/credit",
  requirePermission("rm_requests:manage"),
  rmRequestsController.creditFundingRequest,
);
rmRequestsRouter.post(
  "/funding/:id/reject",
  requirePermission("rm_requests:manage"),
  validate(rejectRmFundingRequestSchema),
  rmRequestsController.rejectFundingRequest,
);

rmRequestsRouter.get(
  "/manual",
  requirePermission("rm_requests:read"),
  validate(listRmManualRequestsQuerySchema, "query"),
  rmRequestsController.listManualRequests,
);
rmRequestsRouter.post(
  "/manual/:id/status",
  requirePermission("rm_requests:manage"),
  validate(setRmManualRequestStatusSchema),
  rmRequestsController.setManualRequestStatus,
);

rmRequestsRouter.get("/rms", requirePermission("rm_requests:manage"), rmRequestsController.listRms);
rmRequestsRouter.post(
  "/assign/:userId",
  requirePermission("rm_requests:manage"),
  validate(assignRmUserSchema),
  rmRequestsController.assignUserToRm,
);
