import type {
  AssignTicketInput,
  CreateTicketInput,
  ListTicketsQuery,
  PaginatedResult,
  TicketAttachment,
  TicketDetail,
  TicketSummary,
  UpdateTicketInput,
} from "@gifftai/shared";
import { ticketsRepository, type AttachmentWithUploader, type TicketWithRelations } from "./tickets.repository";
import { AppError } from "../../lib/apiError";
import { writeAuditLog } from "../../lib/auditLog";
import { uploadObject } from "../../lib/s3Client";
import type { RequestMeta } from "../../lib/requestMeta";

function toSummary(ticket: TicketWithRelations): TicketSummary {
  return {
    id: ticket.id,
    subject: ticket.subject,
    status: ticket.status,
    priority: ticket.priority,
    categoryId: ticket.categoryId,
    categoryName: ticket.category?.name ?? null,
    contactId: ticket.contactId,
    contactName: ticket.contact ? `${ticket.contact.firstName} ${ticket.contact.lastName}` : null,
    requesterEmail: ticket.requesterEmail,
    assignedToId: ticket.assignedToId,
    assignedToName: ticket.assignedTo ? `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}` : null,
    slaId: ticket.slaId,
    slaName: ticket.sla?.name ?? null,
    dueAt: ticket.dueAt?.toISOString() ?? null,
    resolvedAt: ticket.resolvedAt?.toISOString() ?? null,
    closedAt: ticket.closedAt?.toISOString() ?? null,
    createdAt: ticket.createdAt.toISOString(),
  };
}

function toDetail(ticket: TicketWithRelations): TicketDetail {
  return {
    ...toSummary(ticket),
    description: ticket.description,
    updatedAt: ticket.updatedAt.toISOString(),
  };
}

function toAttachment(attachment: AttachmentWithUploader): TicketAttachment {
  return {
    id: attachment.id,
    ticketId: attachment.ticketId!,
    fileName: attachment.fileName,
    fileUrl: attachment.fileUrl,
    mimeType: attachment.mimeType,
    size: attachment.size,
    uploadedById: attachment.uploadedById,
    uploadedByName: `${attachment.uploadedBy.firstName} ${attachment.uploadedBy.lastName}`,
    createdAt: attachment.createdAt.toISOString(),
  };
}

async function assertCategoryExists(categoryId: string): Promise<void> {
  if (!(await ticketsRepository.categoryExists(categoryId))) {
    throw AppError.badRequest("Ticket category does not exist");
  }
}

async function assertContactExists(contactId: string): Promise<void> {
  if (!(await ticketsRepository.contactExists(contactId))) {
    throw AppError.badRequest("Contact does not exist");
  }
}

async function assertSlaExists(slaId: string): Promise<void> {
  if (!(await ticketsRepository.slaExists(slaId))) {
    throw AppError.badRequest("SLA policy does not exist");
  }
}

async function assertAssigneeExists(assignedToId: string): Promise<void> {
  if (!(await ticketsRepository.assigneeExists(assignedToId))) {
    throw AppError.badRequest("Assignee does not exist");
  }
}

/** Status transitions into RESOLVED/CLOSED stamp the corresponding timestamp; moving back
 *  out of them clears it, so dueAt-style timestamps never lag behind the current status. */
function timestampsForStatusChange(
  nextStatus: UpdateTicketInput["status"],
): { resolvedAt?: Date | null; closedAt?: Date | null } {
  if (!nextStatus) return {};
  const now = new Date();
  const resolved = nextStatus === "RESOLVED" || nextStatus === "CLOSED";
  return {
    resolvedAt: resolved ? now : null,
    closedAt: nextStatus === "CLOSED" ? now : null,
  };
}

export const ticketsService = {
  async list(query: ListTicketsQuery): Promise<PaginatedResult<TicketSummary>> {
    const { items, total } = await ticketsRepository.list(query);
    return {
      items: items.map(toSummary),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    };
  },

  async getById(id: string): Promise<TicketDetail> {
    const ticket = await ticketsRepository.findById(id);
    if (!ticket) throw AppError.notFound("Ticket not found");
    return toDetail(ticket);
  },

  async create(input: CreateTicketInput, actorId: string, meta: RequestMeta): Promise<TicketDetail> {
    if (input.categoryId) await assertCategoryExists(input.categoryId);
    if (input.contactId) await assertContactExists(input.contactId);
    if (input.slaId) await assertSlaExists(input.slaId);
    if (input.assignedToId) await assertAssigneeExists(input.assignedToId);

    const ticket = await ticketsRepository.create(input);
    await writeAuditLog({
      userId: actorId,
      action: "ticket.create",
      entityType: "Ticket",
      entityId: ticket.id,
      newValue: input,
      ...meta,
    });

    return toDetail(ticket);
  },

  async update(id: string, input: UpdateTicketInput, actorId: string, meta: RequestMeta): Promise<TicketDetail> {
    const existing = await ticketsRepository.findById(id);
    if (!existing) throw AppError.notFound("Ticket not found");

    if (input.categoryId) await assertCategoryExists(input.categoryId);
    if (input.contactId) await assertContactExists(input.contactId);
    if (input.slaId) await assertSlaExists(input.slaId);

    const updated = await ticketsRepository.update(id, {
      ...input,
      ...timestampsForStatusChange(input.status),
    });
    await writeAuditLog({
      userId: actorId,
      action: "ticket.update",
      entityType: "Ticket",
      entityId: id,
      oldValue: { status: existing.status, priority: existing.priority },
      newValue: input,
      ...meta,
    });

    return toDetail(updated);
  },

  async assign(id: string, input: AssignTicketInput, actorId: string, meta: RequestMeta): Promise<TicketDetail> {
    const existing = await ticketsRepository.findById(id);
    if (!existing) throw AppError.notFound("Ticket not found");

    if (input.assignedToId) await assertAssigneeExists(input.assignedToId);

    const updated = await ticketsRepository.assign(id, input.assignedToId);
    await writeAuditLog({
      userId: actorId,
      action: "ticket.assign",
      entityType: "Ticket",
      entityId: id,
      oldValue: { assignedToId: existing.assignedToId },
      newValue: { assignedToId: input.assignedToId },
      ...meta,
    });

    return toDetail(updated);
  },

  async remove(id: string, actorId: string, meta: RequestMeta): Promise<void> {
    const existing = await ticketsRepository.findById(id);
    if (!existing) throw AppError.notFound("Ticket not found");

    await ticketsRepository.delete(id);
    await writeAuditLog({
      userId: actorId,
      action: "ticket.delete",
      entityType: "Ticket",
      entityId: id,
      oldValue: { subject: existing.subject },
      ...meta,
    });
  },

  async listAttachments(ticketId: string): Promise<TicketAttachment[]> {
    const existing = await ticketsRepository.findById(ticketId);
    if (!existing) throw AppError.notFound("Ticket not found");

    const attachments = await ticketsRepository.listAttachments(ticketId);
    return attachments.map(toAttachment);
  },

  /** `uploadedById` is an explicit param rather than always "the logged-in caller" -- the
   *  public website support-ticket form has no logged-in actor, so it passes the seeded
   *  system user id here (same convention lead-ingestion uses for auto-uploaded attachments). */
  async addAttachment(
    ticketId: string,
    file: { buffer: Buffer; fileName: string; mimeType: string; size: number },
    uploadedById: string,
    meta: RequestMeta,
  ): Promise<TicketAttachment> {
    const existing = await ticketsRepository.findById(ticketId);
    if (!existing) throw AppError.notFound("Ticket not found");

    const { fileKey, fileUrl } = await uploadObject({
      buffer: file.buffer,
      fileName: file.fileName,
      mimeType: file.mimeType,
      prefix: `ticket-attachments/${ticketId}`,
    });

    const attachment = await ticketsRepository.createAttachment({
      ticketId,
      uploadedById,
      fileName: file.fileName,
      fileKey,
      fileUrl,
      mimeType: file.mimeType,
      size: file.size,
    });

    await writeAuditLog({
      userId: uploadedById,
      action: "ticket.attachment_add",
      entityType: "Ticket",
      entityId: ticketId,
      newValue: { fileName: file.fileName },
      ...meta,
    });

    return toAttachment(attachment);
  },

  async removeAttachment(ticketId: string, attachmentId: string, actorId: string, meta: RequestMeta): Promise<void> {
    const attachment = await ticketsRepository.findAttachmentById(attachmentId);
    if (!attachment || attachment.ticketId !== ticketId) throw AppError.notFound("Attachment not found");

    await ticketsRepository.deleteAttachment(attachmentId);
    await writeAuditLog({
      userId: actorId,
      action: "ticket.attachment_remove",
      entityType: "Ticket",
      entityId: ticketId,
      oldValue: { fileName: attachment.fileName },
      ...meta,
    });
  },
};
