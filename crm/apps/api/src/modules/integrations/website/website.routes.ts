import { Router } from "express";
import { websiteContactFormSchema, websiteSupportTicketSchema } from "@gifftai/shared";
import { websiteController } from "./website.controller";
import { validate } from "../../../middleware/validate.middleware";
import { formLimiter } from "../../../middleware/rateLimit.middleware";
import { attachmentUploadArray } from "../../../lib/attachmentUpload";

/** Public, unauthenticated — mounted under /public/website in public.routes.ts. */
export const websiteRouter = Router();

websiteRouter.post("/contact", formLimiter, validate(websiteContactFormSchema), websiteController.submitContactForm);
// attachmentUploadArray only engages for multipart/form-data bodies (a PDF/file attached) --
// a plain JSON submission with no attachment is untouched by it and still works exactly as
// before, so this stays backward-compatible with the existing website form.
websiteRouter.post(
  "/support",
  formLimiter,
  attachmentUploadArray("attachments"),
  validate(websiteSupportTicketSchema),
  websiteController.submitSupportTicket,
);
