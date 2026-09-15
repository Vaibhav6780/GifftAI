import type { Prisma } from "@prisma/client";
import type { ListTicketsQuery } from "@gifftai/shared";
import { prisma } from "../../config/prisma";

const ticketWithRelations = {
  category: { select: { id: true, name: true } },
  contact: { select: { id: true, firstName: true, lastName: true } },
  assignedTo: { select: { id: true, firstName: true, lastName: true } },
  sla: { select: { id: true, name: true } },
} satisfies Prisma.TicketInclude;

export type TicketWithRelations = Prisma.TicketGetPayload<{ include: typeof ticketWithRelations }>;

const attachmentWithUploader = {
  uploadedBy: { select: { firstName: true, lastName: true } },
} satisfies Prisma.AttachmentInclude;

export type AttachmentWithUploader = Prisma.AttachmentGetPayload<{ include: typeof attachmentWithUploader }>;

function buildWhere(
  query: Pick<ListTicketsQuery, "status" | "priority" | "categoryId" | "assignedToId" | "search">,
): Prisma.TicketWhereInput {
  return {
    ...(query.status ? { status: query.status } : {}),
    ...(query.priority ? { priority: query.priority } : {}),
    ...(query.categoryId ? { categoryId: query.categoryId } : {}),
    ...(query.assignedToId ? { assignedToId: query.assignedToId } : {}),
    ...(query.search
      ? {
          OR: [
            { subject: { contains: query.search, mode: "insensitive" } },
            { requesterEmail: { contains: query.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

export const ticketsRepository = {
  findById(id: string): Promise<TicketWithRelations | null> {
    return prisma.ticket.findUnique({ where: { id }, include: ticketWithRelations });
  },

  async list(query: ListTicketsQuery): Promise<{ items: TicketWithRelations[]; total: number }> {
    const where = buildWhere(query);

    const [items, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: ticketWithRelations,
        orderBy: { [query.sortBy]: query.sortOrder },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.ticket.count({ where }),
    ]);

    return { items, total };
  },

  create(data: {
    subject: string;
    description?: string;
    status?: Prisma.TicketCreateInput["status"];
    priority?: Prisma.TicketCreateInput["priority"];
    categoryId?: string | null;
    contactId?: string | null;
    requesterEmail?: string;
    assignedToId?: string | null;
    slaId?: string | null;
  }): Promise<TicketWithRelations> {
    return prisma.ticket.create({ data, include: ticketWithRelations });
  },

  update(
    id: string,
    data: {
      subject?: string;
      description?: string | null;
      status?: Prisma.TicketUpdateInput["status"];
      priority?: Prisma.TicketUpdateInput["priority"];
      categoryId?: string | null;
      contactId?: string | null;
      requesterEmail?: string | null;
      slaId?: string | null;
      resolvedAt?: Date | null;
      closedAt?: Date | null;
    },
  ): Promise<TicketWithRelations> {
    return prisma.ticket.update({ where: { id }, data, include: ticketWithRelations });
  },

  assign(id: string, assignedToId: string | null): Promise<TicketWithRelations> {
    return prisma.ticket.update({ where: { id }, data: { assignedToId }, include: ticketWithRelations });
  },

  delete(id: string) {
    return prisma.ticket.delete({ where: { id } });
  },

  categoryExists(id: string) {
    return prisma.ticketCategory.findUnique({ where: { id }, select: { id: true } }).then(Boolean);
  },

  contactExists(id: string) {
    return prisma.contact.findUnique({ where: { id }, select: { id: true } }).then(Boolean);
  },

  slaExists(id: string) {
    return prisma.sLAPolicy.findUnique({ where: { id }, select: { id: true } }).then(Boolean);
  },

  assigneeExists(id: string) {
    return prisma.user.findUnique({ where: { id }, select: { id: true } }).then(Boolean);
  },

  listAttachments(ticketId: string): Promise<AttachmentWithUploader[]> {
    return prisma.attachment.findMany({
      where: { ticketId },
      include: attachmentWithUploader,
      orderBy: { createdAt: "desc" },
    });
  },

  findAttachmentById(id: string) {
    return prisma.attachment.findUnique({ where: { id } });
  },

  createAttachment(data: {
    ticketId: string;
    uploadedById: string;
    fileName: string;
    fileKey: string;
    fileUrl: string;
    mimeType: string;
    size: number;
  }): Promise<AttachmentWithUploader> {
    return prisma.attachment.create({ data, include: attachmentWithUploader });
  },

  deleteAttachment(id: string) {
    return prisma.attachment.delete({ where: { id } });
  },
};
