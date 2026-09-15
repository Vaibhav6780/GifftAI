import { z } from "zod";

const cuid = z.string().cuid();

export const ticketStatusSchema = z.enum(["OPEN", "PENDING", "RESOLVED", "CLOSED"]);
export type TicketStatusInput = z.infer<typeof ticketStatusSchema>;

export const ticketPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);
export type TicketPriorityInput = z.infer<typeof ticketPrioritySchema>;

export const createTicketSchema = z.object({
  subject: z.string().min(1, "Subject is required").max(200),
  description: z.string().max(5000).optional(),
  status: ticketStatusSchema.optional(),
  priority: ticketPrioritySchema.optional(),
  categoryId: cuid.nullable().optional(),
  contactId: cuid.nullable().optional(),
  requesterEmail: z.string().email("Enter a valid email address").optional(),
  assignedToId: cuid.nullable().optional(),
  slaId: cuid.nullable().optional(),
});
export type CreateTicketInput = z.infer<typeof createTicketSchema>;

export const updateTicketSchema = z.object({
  subject: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).nullable().optional(),
  status: ticketStatusSchema.optional(),
  priority: ticketPrioritySchema.optional(),
  categoryId: cuid.nullable().optional(),
  contactId: cuid.nullable().optional(),
  requesterEmail: z.string().email("Enter a valid email address").nullable().optional(),
  slaId: cuid.nullable().optional(),
});
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;

export const assignTicketSchema = z.object({
  assignedToId: cuid.nullable(),
});
export type AssignTicketInput = z.infer<typeof assignTicketSchema>;

export const listTicketsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().max(200).optional(),
  status: ticketStatusSchema.optional(),
  priority: ticketPrioritySchema.optional(),
  categoryId: cuid.optional(),
  assignedToId: cuid.optional(),
  sortBy: z.enum(["subject", "status", "priority", "createdAt", "updatedAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
export type ListTicketsQuery = z.infer<typeof listTicketsQuerySchema>;
