import { Router } from "express";
import { createContactSchema, listContactsQuerySchema, updateContactSchema } from "@gifftai/shared";
import { contactsController } from "./contacts.controller";
import { validate } from "../../middleware/validate.middleware";
import { requireAuth } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/rbac.middleware";

export const contactsRouter = Router();

contactsRouter.use(requireAuth);

contactsRouter.get(
  "/",
  requirePermission("contacts:read"),
  validate(listContactsQuerySchema, "query"),
  contactsController.list,
);
contactsRouter.get("/:id", requirePermission("contacts:read"), contactsController.getById);
contactsRouter.post(
  "/",
  requirePermission("contacts:create"),
  validate(createContactSchema),
  contactsController.create,
);
contactsRouter.patch(
  "/:id",
  requirePermission("contacts:update"),
  validate(updateContactSchema),
  contactsController.update,
);
contactsRouter.delete("/:id", requirePermission("contacts:delete"), contactsController.remove);
