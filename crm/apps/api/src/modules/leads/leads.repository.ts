import type { Prisma } from "@prisma/client";
import type { ExportLeadsQuery, LeadsStatsQuery, ListLeadFollowupsQuery, ListLeadsQuery } from "@gifftai/shared";
import { prisma } from "../../config/prisma";

const leadWithRelations = {
  source: { select: { id: true, name: true } },
  owner: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.LeadInclude;

export type LeadWithRelations = Prisma.LeadGetPayload<{ include: typeof leadWithRelations }>;

const leadFollowupWithLead = {
  lead: { include: leadWithRelations },
} satisfies Prisma.LeadFollowupInclude;

export type LeadFollowupWithLead = Prisma.LeadFollowupGetPayload<{ include: typeof leadFollowupWithLead }>;

const auditLogWithUser = {
  user: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.AuditLogInclude;

function buildWhere(
  query: Pick<
    ListLeadsQuery,
    "status" | "sourceId" | "ownerId" | "brand" | "needsFollowup" | "createdDate" | "followupDate" | "search"
  >,
): Prisma.LeadWhereInput {
  return {
    ...(query.status ? { status: query.status } : {}),
    ...(query.sourceId ? { sourceId: query.sourceId } : {}),
    ...(query.ownerId ? { ownerId: query.ownerId } : {}),
    ...(query.brand ? { brand: query.brand } : {}),
    ...(query.needsFollowup ? { needsFollowup: true } : {}),
    ...(query.createdDate
      ? {
          createdAt: {
            gte: new Date(`${query.createdDate}T00:00:00.000Z`),
            lte: new Date(`${query.createdDate}T23:59:59.999Z`),
          },
        }
      : {}),
    ...(query.followupDate
      ? {
          followupDate: {
            gte: new Date(`${query.followupDate}T00:00:00.000Z`),
            lte: new Date(`${query.followupDate}T23:59:59.999Z`),
          },
        }
      : {}),
    ...(query.search
      ? {
          OR: [
            { firstName: { contains: query.search, mode: "insensitive" } },
            { lastName: { contains: query.search, mode: "insensitive" } },
            { email: { contains: query.search, mode: "insensitive" } },
            { company: { contains: query.search, mode: "insensitive" } },
            { phone: { contains: query.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

export const leadsRepository = {
  findById(id: string): Promise<LeadWithRelations | null> {
    return prisma.lead.findUnique({ where: { id }, include: leadWithRelations });
  },

  async list(query: ListLeadsQuery): Promise<{ items: LeadWithRelations[]; total: number }> {
    const where = buildWhere(query);

    const [items, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        include: leadWithRelations,
        orderBy: { [query.sortBy]: query.sortOrder },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.lead.count({ where }),
    ]);

    return { items, total };
  },

  /** Same filters as `list`, but unpaginated — used for exports. */
  listAll(query: ExportLeadsQuery): Promise<LeadWithRelations[]> {
    return prisma.lead.findMany({
      where: buildWhere(query),
      include: leadWithRelations,
      orderBy: { [query.sortBy]: query.sortOrder },
    });
  },

  /** Same filters as `list` (minus sorting), restricted to a specific set of lead ids — used
   *  by the "Contacted Today" page to apply search/status/source/owner filters on top of the
   *  set of leads that had activity on the selected date. Unpaginated: that candidate set is
   *  already narrowed by the caller to a single day's activity, and the caller sorts/paginates
   *  in memory by latest-activity time (not a plain Lead column, so it can't be an `orderBy`
   *  here). */
  listByIds(
    ids: string[],
    query: Pick<ListLeadsQuery, "status" | "sourceId" | "ownerId" | "brand" | "search">,
  ): Promise<LeadWithRelations[]> {
    return prisma.lead.findMany({
      where: { id: { in: ids }, ...buildWhere(query) },
      include: leadWithRelations,
    });
  },

  /** Lead-scoped audit trail entries for a calendar day — covers creates, edits, status/name/
   *  follow-up changes, owner reassignment, notes, and conversions (every `lead.*` audit
   *  action `leadsService` writes), for the "Contacted Today" page's activity feed. */
  listAuditActivityForRange(start: Date, end: Date) {
    return prisma.auditLog.findMany({
      where: { entityType: "Lead", action: { startsWith: "lead." }, createdAt: { gte: start, lte: end } },
      select: { entityId: true, action: true, createdAt: true, oldValue: true, newValue: true },
    });
  },

  /** Inbound/outbound messages (calls/emails/chats all flow through the same `Message` model
   *  regardless of channel) linked to a lead via its `Conversation`, for the same day-range
   *  activity feed. */
  listMessageActivityForRange(start: Date, end: Date) {
    return prisma.message.findMany({
      where: { createdAt: { gte: start, lte: end }, conversation: { leadId: { not: null } } },
      select: { createdAt: true, senderType: true, conversation: { select: { leadId: true } } },
    });
  },

  /** Ingestion-written `Activity` rows (e.g. "lead created via WhatsApp") for the same
   *  day-range activity feed — the third and last source `leadsTimelineService` already
   *  merges per-lead, reused here across all leads at once. */
  listIngestionActivityForRange(start: Date, end: Date) {
    return prisma.activity.findMany({
      where: { leadId: { not: null }, createdAt: { gte: start, lte: end } },
      select: { leadId: true, createdAt: true, type: true, description: true },
    });
  },

  /** Per-status counts under the given filters (status itself excluded from the filter —
   *  see leadsStatsQuerySchema) for the Leads page's clickable stat tiles. */
  countByStatus(query: LeadsStatsQuery) {
    return prisma.lead.groupBy({
      by: ["status"],
      where: buildWhere(query),
      _count: true,
    });
  },

  create(data: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    company?: string;
    jobTitle?: string;
    status?: Prisma.LeadCreateInput["status"];
    score?: number;
    value?: number;
    description?: string;
    sourceId?: string | null;
    ownerId?: string | null;
    brand?: Prisma.LeadCreateInput["brand"];
  }): Promise<LeadWithRelations> {
    return prisma.lead.create({ data, include: leadWithRelations });
  },

  update(
    id: string,
    data: {
      firstName?: string;
      lastName?: string;
      email?: string | null;
      phone?: string | null;
      company?: string | null;
      jobTitle?: string | null;
      status?: Prisma.LeadUpdateInput["status"];
      score?: number;
      value?: number | null;
      description?: string | null;
      sourceId?: string | null;
      needsFollowup?: boolean;
      followupDate?: Date | null;
      followupTime?: string | null;
    },
  ): Promise<LeadWithRelations> {
    return prisma.lead.update({ where: { id }, data, include: leadWithRelations });
  },

  assign(id: string, ownerId: string | null): Promise<LeadWithRelations> {
    return prisma.lead.update({ where: { id }, data: { ownerId }, include: leadWithRelations });
  },

  markContacted(id: string, contactedAt: Date | null): Promise<LeadWithRelations> {
    return prisma.lead.update({ where: { id }, data: { contactedAt }, include: leadWithRelations });
  },

  async bulkAssign(leadIds: string[], ownerId: string | null): Promise<{ count: number }> {
    return prisma.lead.updateMany({ where: { id: { in: leadIds } }, data: { ownerId } });
  },

  findManyByIds(leadIds: string[]): Promise<LeadWithRelations[]> {
    return prisma.lead.findMany({ where: { id: { in: leadIds } }, include: leadWithRelations });
  },

  delete(id: string) {
    return prisma.lead.delete({ where: { id } });
  },

  sourceExists(id: string) {
    return prisma.leadSource.findUnique({ where: { id }, select: { id: true } }).then(Boolean);
  },

  ownerExists(id: string) {
    return prisma.user.findUnique({ where: { id }, select: { id: true } }).then(Boolean);
  },

  /** Persistent, date-aware Complete/Incomplete history for the Follow-ups Due page — reads
   *  `LeadFollowup` rows directly (each one a distinct engagement with its own due date and
   *  completion state), not `Lead.needsFollowup`/`followupDate` (which only ever reflect the
   *  current/latest one). See recordFollowupHistory below for how rows get written. */
  async listFollowups(
    query: ListLeadFollowupsQuery,
  ): Promise<{ items: LeadFollowupWithLead[]; total: number }> {
    const where: Prisma.LeadFollowupWhereInput = {
      ...(query.followupDate
        ? {
            followupDate: {
              gte: new Date(`${query.followupDate}T00:00:00.000Z`),
              lte: new Date(`${query.followupDate}T23:59:59.999Z`),
            },
          }
        : {}),
      ...(query.completed === "yes" ? { completedAt: { not: null } } : {}),
      ...(query.completed === "no" ? { completedAt: null } : {}),
      lead: {
        ...(query.ownerId ? { ownerId: query.ownerId } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.brand ? { brand: query.brand } : {}),
        ...(query.search
          ? {
              OR: [
                { firstName: { contains: query.search, mode: "insensitive" } },
                { lastName: { contains: query.search, mode: "insensitive" } },
                { email: { contains: query.search, mode: "insensitive" } },
                { company: { contains: query.search, mode: "insensitive" } },
                { phone: { contains: query.search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
    };

    const [items, total] = await Promise.all([
      prisma.leadFollowup.findMany({
        where,
        include: leadFollowupWithLead,
        orderBy: { followupDate: "asc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.leadFollowup.count({ where }),
    ]);

    return { items, total };
  },

  /** Writes the Follow-ups Due history side-effect of a follow-up change — called from
   *  leadsService.update's followupChanging block with the exact before/after values already
   *  computed there for the `lead.followup_change` audit entry, so this only ever runs when a
   *  follow-up-relevant field actually changed. Keeps at most one open (completedAt: null) row
   *  per lead, mirroring the single-slot invariant Lead.needsFollowup/followupDate already
   *  enforce:
   *    off -> on            : open a new engagement.
   *    on -> on, date moved : same engagement, move its due date (not a new row).
   *    on -> off             : close the currently-open engagement.
   *  Deliberately best-effort/silent on the "no open row found to close" case (e.g. a lead
   *  whose active follow-up predates this table and was never backfilled) rather than
   *  throwing — the history is a derived record, not the source of truth Lead itself is. */
  async recordFollowupHistory(
    leadId: string,
    before: { needsFollowup: boolean; followupDate: Date | null; followupTime?: string | null },
    after: { needsFollowup: boolean; followupDate: Date | null; followupTime?: string | null },
  ): Promise<void> {
    if (!before.needsFollowup && after.needsFollowup) {
      if (after.followupDate) {
        await prisma.leadFollowup.create({
          data: { leadId, followupDate: after.followupDate, followupTime: after.followupTime ?? null },
        });
      }
      return;
    }
    if (before.needsFollowup && after.needsFollowup && after.followupDate) {
      await prisma.leadFollowup.updateMany({
        where: { leadId, completedAt: null },
        data: { followupDate: after.followupDate, followupTime: after.followupTime ?? null },
      });
      return;
    }
    if (before.needsFollowup && !after.needsFollowup) {
      await prisma.leadFollowup.updateMany({
        where: { leadId, completedAt: null },
        data: { completedAt: new Date() },
      });
    }
  },

  /** Status/name/follow-up-change entries written by leadsService.update as dedicated audit
   *  actions (distinct from the generic "lead.update" log), so the activity feed can query
   *  for exactly these without parsing arbitrary oldValue/newValue JSON shapes. */
  listActivityAuditEntries(leadId: string) {
    return prisma.auditLog.findMany({
      where: {
        entityType: "Lead",
        entityId: leadId,
        action: { in: ["lead.status_change", "lead.name_change", "lead.followup_change"] },
      },
      include: auditLogWithUser,
      orderBy: { createdAt: "asc" },
    });
  },

  createNote(leadId: string, userId: string, body: string) {
    return prisma.note.create({
      data: { leadId, userId, body },
      include: { user: { select: { firstName: true, lastName: true } } },
    });
  },

  listNotes(leadId: string) {
    return prisma.note.findMany({
      where: { leadId },
      include: { user: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" },
    });
  },

  findNoteById(noteId: string) {
    return prisma.note.findUnique({ where: { id: noteId } });
  },

  updateNote(noteId: string, body: string) {
    return prisma.note.update({
      where: { id: noteId },
      data: { body },
      include: { user: { select: { firstName: true, lastName: true } } },
    });
  },

  /** Creates a Contact from the lead's fields (find-or-create-by-name a Company if the
   *  lead's free-text `company` is set), links it back via `convertedContactId`, and flips
   *  status to CONVERTED — all in one transaction. */
  convertToContact(
    leadId: string,
    contactData: {
      firstName: string;
      lastName: string;
      email?: string | null;
      phone?: string | null;
      jobTitle?: string | null;
      ownerId?: string | null;
    },
    companyName: string | null | undefined,
  ): Promise<{ contactId: string }> {
    return prisma.$transaction(async (tx) => {
      let companyId: string | undefined;
      if (companyName) {
        const existingCompany = await tx.company.findFirst({ where: { name: companyName } });
        companyId = existingCompany ? existingCompany.id : (await tx.company.create({ data: { name: companyName } })).id;
      }

      const contact = await tx.contact.create({
        data: { ...contactData, companyId },
      });

      // Conversion state lives entirely on convertedContactId/convertedAt (the "Convert to
      // Contact" button's visibility and the "View contact →" link both key off
      // convertedContactId, not status) — status is deliberately left untouched here, since
      // the 5-value HOT/WARM/COLD/etc. scheme has no "converted" bucket to force it into.
      await tx.lead.update({
        where: { id: leadId },
        data: { convertedContactId: contact.id, convertedAt: new Date() },
      });

      return { contactId: contact.id };
    });
  },
};
