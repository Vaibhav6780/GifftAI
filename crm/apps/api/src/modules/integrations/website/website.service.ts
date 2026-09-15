import type { WebsiteContactFormInput, WebsiteSupportTicketInput } from "@gifftai/shared";
import { leadIngestionService } from "../../lead-ingestion/lead-ingestion.service";
import { ticketsService } from "../../tickets/tickets.service";
import { getSystemUserId } from "../../../lib/systemUser";
import type { RequestMeta } from "../../../lib/requestMeta";

/** Splits a single "full name" field (most contact forms only ask for one) into
 *  Lead.firstName/lastName — the first word is the first name, the rest is the last name. */
function splitName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/);
  return { firstName: parts[0] ?? name, lastName: parts.slice(1).join(" ") };
}

export const websiteService = {
  async submitContactForm(input: WebsiteContactFormInput) {
    const { firstName, lastName } = splitName(input.name);

    const { lead, created } = await leadIngestionService.ingest({
      source: "WEBSITE",
      firstName,
      lastName,
      email: input.email,
      phone: input.phone,
      company: input.company,
      message: input.message,
      occurredAt: new Date(),
      raw: input,
    });

    return { lead, created };
  },

  /** Support-ticket submissions have no logged-in actor, so both the ticket and any
   *  attachments are attributed to the seeded system user — same convention lead-ingestion
   *  uses for auto-uploaded attachments. */
  async submitSupportTicket(
    input: WebsiteSupportTicketInput,
    files: Express.Multer.File[],
    meta: RequestMeta,
  ) {
    const systemUserId = await getSystemUserId();
    const contactLines = [`Name: ${input.name}`, input.phone ? `Phone: ${input.phone}` : null].filter(Boolean);
    const description = `${input.message}\n\n${contactLines.join("\n")}`;

    const ticket = await ticketsService.create(
      {
        subject: input.subject,
        description,
        requesterEmail: input.email,
      },
      systemUserId,
      meta,
    );

    for (const file of files) {
      await ticketsService.addAttachment(
        ticket.id,
        { buffer: file.buffer, fileName: file.originalname, mimeType: file.mimetype, size: file.size },
        systemUserId,
        meta,
      );
    }

    return { ticket };
  },
};
