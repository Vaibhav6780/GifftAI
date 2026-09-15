export type TicketStatus = "OPEN" | "PENDING" | "RESOLVED" | "CLOSED";
export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface TicketCategoryOption {
  id: string;
  name: string;
}

export interface TicketSummary {
  id: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  categoryId: string | null;
  categoryName: string | null;
  contactId: string | null;
  contactName: string | null;
  requesterEmail: string | null;
  assignedToId: string | null;
  assignedToName: string | null;
  slaId: string | null;
  slaName: string | null;
  dueAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  createdAt: string;
}

export interface TicketDetail extends TicketSummary {
  description: string | null;
  updatedAt: string;
}

/** A file attached to a ticket -- either uploaded by an agent from the CRM's Ticket detail
 *  page, or submitted by an anonymous visitor via the public website support-ticket form
 *  (attributed to the seeded system user in that case, same convention as lead-ingestion
 *  attachments). */
export interface TicketAttachment {
  id: string;
  ticketId: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  size: number;
  uploadedById: string;
  uploadedByName: string;
  createdAt: string;
}
