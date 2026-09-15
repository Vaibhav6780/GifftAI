import { Router } from "express";
import { createCompanySchema, listCompaniesQuerySchema, updateCompanySchema } from "@gifftai/shared";
import { companiesController } from "./companies.controller";
import { validate } from "../../middleware/validate.middleware";
import { requireAuth } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/rbac.middleware";

export const companiesRouter = Router();

companiesRouter.use(requireAuth);

companiesRouter.get(
  "/",
  requirePermission("companies:read"),
  validate(listCompaniesQuerySchema, "query"),
  companiesController.list,
);
companiesRouter.get("/:id", requirePermission("companies:read"), companiesController.getById);
companiesRouter.post(
  "/",
  requirePermission("companies:create"),
  validate(createCompanySchema),
  companiesController.create,
);
companiesRouter.patch(
  "/:id",
  requirePermission("companies:update"),
  validate(updateCompanySchema),
  companiesController.update,
);
companiesRouter.delete("/:id", requirePermission("companies:delete"), companiesController.remove);
