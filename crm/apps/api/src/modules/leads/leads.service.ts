import type {
  AssignLeadInput,
  BulkAssignLeadsInput,
  ContactedLeadsQuery,
  CreateLeadInput,
  CreateLeadNoteInput,
  ExportLeadsQuery,
  LeadActivityEntry,
  LeadContactedSummary,
  LeadDetail,
  LeadFollowupSummary,
  LeadNote,
  LeadStatus,
  LeadStatusCounts,
  LeadSummary,
  LeadsStatsQuery,
  ListLeadFollowupsQuery,
  ListLeadsQuery,
  MarkLeadContactedInput,
  PaginatedResult,
  UpdateLeadInput,
} from "@gifftai/shared";
import { leadStatusSchema } from "@gifftai/shared";
import { leadsRepository, type LeadFollowupWithLead, type LeadWithRelations } from "./leads.repository";
import { AppError } from "../../lib/apiError";
import { writeAuditLog } from "../../lib/auditLog";
import { isPrivilegedRole } from "../../lib/authz";
import type { RequestMeta } from "../../lib/requestMeta";
import type { RequestUser } from "../../types/express";
import { io } from "../../sockets";

function toSummary(lead: LeadWithRelations): LeadSummary {
  return {
    id: lead.id,
    firstName: lead.firstName,
    lastName: lead.lastName,
    email: lead.email,
    phone: lead.phone,
    company: lead.company,
    jobTitle: lead.jobTitle,
    status: lead.status,
    score: lead.score,
    value: lead.value ? Number(lead.value) : null,
    sourceId: lead.sourceId,
    sourceName: lead.source?.name ?? null,
    ownerId: lead.ownerId,
    ownerName: lead.owner ? `${lead.owner.firstName} ${lead.owner.lastName}` : null,
    needsFollowup: lead.needsFollowup,
    followupDate: lead.followupDate?.toISOString() ?? null,
    followupTime: lead.followupTime ?? null,
    convertedContactId: lead.convertedContactId,
    createdAt: lead.createdAt.toISOString(),
    brand: lead.brand,
  };
}

function toDetail(lead: LeadWithRelations): LeadDetail {
  return {
    ...toSummary(lead),
    description: lead.description,
    updatedAt: lead.updatedAt.toISOString(),
  };
}

function toFollowupSummary(followup: LeadFollowupWithLead): LeadFollowupSummary {
  return {
    ...toSummary(followup.lead),
    followupId: followup.id,
    dueDate: followup.followupDate.toISOString(),
    dueTime: followup.followupTime ?? null,
    completedAt: followup.completedAt?.toISOString() ?? null,
  };
}

type FollowupAuditValue = { needsFollowup?: boolean; followupDate?: string | null; followupTime?: string | null };

function formatFollowupChange(oldValue: FollowupAuditValue | null, newValue: FollowupAuditValue | null): string {
  if (!newValue?.needsFollowup) return "cleared the follow-up";
  const dateLabel = newValue.followupDate ? new Date(newValue.followupDate).toLocaleDateString() : "an unspecified date";
  const label = newValue.followupTime ? `${dateLabel} at ${newValue.followupTime}` : dateLabel;
  return oldValue?.needsFollowup ? `updated the follow-up date to ${label}` : `set a follow-up for ${label}`;
}

/** Human-readable one-liner for a `lead.*` audit action, used by the "Contacted Today" feed
 *  where a lead only gets one summary row regardless of how many actions happened that day —
 *  unlike `getActivity` above, this doesn't need the full old/new diff, just what to show for
 *  "latest activity". */
function describeAuditActivity(action: string, oldValue: unknown, newValue: unknown): string {
  switch (action) {
    case "lead.create":
      return "Lead created";
    case "lead.status_change": {
      const value = newValue as { status?: LeadStatus } | null;
      return value?.status ? `Status changed to ${value.status}` : "Status changed";
    }
    case "lead.name_change":
      return "Name updated";
    case "lead.followup_change":
      return formatFollowupChange(oldValue as FollowupAuditValue | null, newValue as FollowupAuditValue | null);
    case "lead.assign":
      return "Owner reassigned";
    case "lead.note_create":
      return "Note added";
    case "lead.note_update":
      return "Note updated";
    case "lead.convert":
      return "Converted to contact";
    case "lead.contacted":
      return "Marked as contacted";
    case "lead.uncontacted":
      return "Unmarked as contacted";
    case "lead.update":
      return "Lead details updated";
    default:
      return "Lead updated";
  }
}

/** True when `date` (a UTC calendar day, e.g. from the Contacted Today page) falls on the
 *  same UTC day as `at` -- used to scope the global `Lead.contactedAt` timestamp to "was this
 *  lead marked contacted on the day being viewed". */
function isSameUtcDay(at: Date, date: string): boolean {
  return at.toISOString().slice(0, 10) === date;
}

async function assertSourceExists(sourceId: string): Promise<void> {
  if (!(await leadsRepository.sourceExists(sourceId))) {
    throw AppError.badRequest("Lead source does not exist");
  }
}

async function assertOwnerExists(ownerId: string): Promise<void> {
  if (!(await leadsRepository.ownerExists(ownerId))) {
    throw AppError.badRequest("Owner does not exist");
  }
}

/** Only the lead's assigned owner, or an Admin/Super Admin, may perform ownership-gated
 *  actions on it (notes, follow-up) — regardless of how broad the caller's `leads:update`
 *  permission grant is. */
function assertOwnerOrPrivileged(lead: { ownerId: string | null }, actor: RequestUser, action: string): void {
  if (lead.ownerId === actor.id || isPrivilegedRole(actor)) return;
  throw AppError.forbidden(`Only the assigned owner or an admin can ${action}`);
}

export const leadsService = {
  async list(query: ListLeadsQuery): Promise<PaginatedResult<LeadSummary>> {
    const { items, total } = await leadsRepository.list(query);
    return {
      items: items.map(toSummary),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    };
  },

  async exportList(query: ExportLeadsQuery): Promise<LeadSummary[]> {
    const items = await leadsRepository.listAll(query);
    return items.map(toSummary);
  },

  async listFollowups(query: ListLeadFollowupsQuery): Promise<PaginatedResult<LeadFollowupSummary>> {
    const { items, total } = await leadsRepository.listFollowups(query);
    return {
      items: items.map(toFollowupSummary),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    };
  },

  async getStatusCounts(query: LeadsStatsQuery): Promise<LeadStatusCounts> {
    const grouped = await leadsRepository.countByStatus(query);
    const counts = Object.fromEntries(leadStatusSchema.options.map((status) => [status, 0])) as LeadStatusCounts;
    for (const row of grouped) {
      counts[row.status] = row._count;
    }
    return counts;
  },

  /** Leads with any tracked activity/change on a single calendar day — every `lead.*` audit
   *  action (edits, status/name/follow-up changes, owner reassignment, notes, conversions),
   *  every message on a lead-linked conversation (calls/emails/chats, any channel), and every
   *  ingestion-written `Activity` row, deduped to one row per lead (its single most recent
   *  action that day) and reusing the same search/status/source/owner filters, pagination, and
   *  permission gate as the main Leads list. Deliberately no new tracking system — this reads
   *  the same `AuditLog`/`Message`/`Activity` tables the per-lead activity feed
   *  (`getActivity`) and timeline (`leadsTimelineService`) already merge, just across leads
   *  instead of within one. */
  async listContacted(query: ContactedLeadsQuery): Promise<PaginatedResult<LeadContactedSummary>> {
    const dayStart = new Date(`${query.date}T00:00:00.000Z`);
    const dayEnd = new Date(`${query.date}T23:59:59.999Z`);

    const [auditEntries, messages, ingestionActivities] = await Promise.all([
      leadsRepository.listAuditActivityForRange(dayStart, dayEnd),
      leadsRepository.listMessageActivityForRange(dayStart, dayEnd),
      leadsRepository.listIngestionActivityForRange(dayStart, dayEnd),
    ]);

    const latest = new Map<string, { occurredAt: Date; label: string }>();
    function record(leadId: string | null | undefined, occurredAt: Date, label: string): void {
      if (!leadId) return;
      const existing = latest.get(leadId);
      if (!existing || occurredAt.getTime() > existing.occurredAt.getTime()) {
        latest.set(leadId, { occurredAt, label });
      }
    }

    for (const entry of auditEntries) {
      // The lead no longer exists to show a row for, so a delete can't be "latest activity".
      if (entry.action === "lead.delete") continue;
      record(entry.entityId, entry.createdAt, describeAuditActivity(entry.action, entry.oldValue, entry.newValue));
    }
    for (const message of messages) {
      record(
        message.conversation.leadId,
        message.createdAt,
        message.senderType === "AGENT" ? "Outbound message sent" : "Inbound message received",
      );
    }
    for (const activity of ingestionActivities) {
      record(activity.leadId, activity.createdAt, activity.description || activity.type);
    }

    if (latest.size === 0) {
      return { items: [], page: query.page, pageSize: query.pageSize, total: 0, totalPages: 1 };
    }

    const candidates = await leadsRepository.listByIds(Array.from(latest.keys()), {
      search: query.search,
      status: query.status,
      sourceId: query.sourceId,
      ownerId: query.ownerId,
    });

    const withActivity = candidates
      .map((lead) => ({
        lead,
        ...latest.get(lead.id)!,
        contactedAt: lead.contactedAt && isSameUtcDay(lead.contactedAt, query.date) ? lead.contactedAt : null,
      }))
      .filter((row) => {
        if (query.contacted === "yes") return row.contactedAt !== null;
        if (query.contacted === "no") return row.contactedAt === null;
        return true;
      })
      .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());

    const total = withActivity.length;
    const start = (query.page - 1) * query.pageSize;
    const pageItems = withActivity.slice(start, start + query.pageSize);

    return {
      items: pageItems.map(({ lead, occurredAt, label, contactedAt }) => ({
        ...toSummary(lead),
        latestActivityAt: occurredAt.toISOString(),
        latestActivityLabel: label,
        contactedAt: contactedAt?.toISOString() ?? null,
      })),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    };
  },

  async getById(id: string): Promise<LeadDetail> {
    const lead = await leadsRepository.findById(id);
    if (!lead) throw AppError.notFound("Lead not found");
    return toDetail(lead);
  },

  async create(input: CreateLeadInput, actorId: string, meta: RequestMeta): Promise<LeadDetail> {
    if (input.sourceId) await assertSourceExists(input.sourceId);

    const ownerId = input.ownerId === undefined ? actorId : input.ownerId;
    if (ownerId) await assertOwnerExists(ownerId);

    const lead = await leadsRepository.create({ ...input, ownerId });
    await writeAuditLog({
      userId: actorId,
      action: "lead.create",
      entityType: "Lead",
      entityId: lead.id,
      newValue: input,
      ...meta,
    });

    io?.emit("lead:created", { leadId: lead.id });

    return toDetail(lead);
  },

  async update(id: string, input: UpdateLeadInput, actor: RequestUser, meta: RequestMeta): Promise<LeadDetail> {
    const existing = await leadsRepository.findById(id);
    if (!existing) throw AppError.notFound("Lead not found");

    // Only the assigned employee (or an admin) may set/clear the follow-up flag — every
    // other field on this same PATCH just needs the broader `leads:update` permission.
    const followupChanging =
      input.needsFollowup !== undefined || input.followupDate !== undefined || input.followupTime !== undefined;
    if (followupChanging) assertOwnerOrPrivileged(existing, actor, "manage this lead's follow-up");

    const resultingNeedsFollowup = input.needsFollowup ?? existing.needsFollowup;
    const resultingFollowupDate = input.followupDate !== undefined ? input.followupDate : existing.followupDate;
    if (resultingNeedsFollowup && !resultingFollowupDate) {
      throw AppError.badRequest("A follow-up date is required when marking a lead for follow-up");
    }

    if (input.sourceId) await assertSourceExists(input.sourceId);

    const updated = await leadsRepository.update(id, {
      ...input,
      followupDate: input.followupDate !== undefined ? (input.followupDate ? new Date(input.followupDate) : null) : undefined,
      // Turning follow-up off always clears the date (and time) too, even if the caller
      // didn't send them.
      ...(input.needsFollowup === false ? { followupDate: null, followupTime: null } : {}),
    });
    await writeAuditLog({
      userId: actor.id,
      action: "lead.update",
      entityType: "Lead",
      entityId: id,
      newValue: input,
      ...meta,
    });

    const statusChanging = Boolean(input.status && input.status !== existing.status);
    if (statusChanging) {
      await writeAuditLog({
        userId: actor.id,
        action: "lead.status_change",
        entityType: "Lead",
        entityId: id,
        oldValue: { status: existing.status },
        newValue: { status: input.status },
        ...meta,
      });
      io?.emit("lead:status_changed", { leadId: id, status: input.status });
    }

    const nameChanging =
      (input.firstName !== undefined && input.firstName !== existing.firstName) ||
      (input.lastName !== undefined && input.lastName !== existing.lastName);
    if (nameChanging) {
      await writeAuditLog({
        userId: actor.id,
        action: "lead.name_change",
        entityType: "Lead",
        entityId: id,
        oldValue: { firstName: existing.firstName, lastName: existing.lastName },
        newValue: { firstName: updated.firstName, lastName: updated.lastName },
        ...meta,
      });
    }

    // Compares against the actually-persisted result (`updated`), not just the raw input,
    // since "turning follow-up off always clears the date too" above can change followupDate
    // even on a request that only sent `needsFollowup`.
    const existingFollowupDateIso = existing.followupDate?.toISOString() ?? null;
    const updatedFollowupDateIso = updated.followupDate?.toISOString() ?? null;
    if (
      followupChanging &&
      (updated.needsFollowup !== existing.needsFollowup ||
        updatedFollowupDateIso !== existingFollowupDateIso ||
        updated.followupTime !== existing.followupTime)
    ) {
      await writeAuditLog({
        userId: actor.id,
        action: "lead.followup_change",
        entityType: "Lead",
        entityId: id,
        oldValue: { needsFollowup: existing.needsFollowup, followupDate: existingFollowupDateIso, followupTime: existing.followupTime },
        newValue: { needsFollowup: updated.needsFollowup, followupDate: updatedFollowupDateIso, followupTime: updated.followupTime },
        ...meta,
      });
      // Persistent, date-aware history for the Follow-ups Due page's Complete/Incomplete
      // filter — see recordFollowupHistory's own doc comment for the open/close/reschedule
      // rules. Fires for every follow-up-changing update regardless of which UI surface made
      // it (this page, the main Leads list's inline cell, or the Lead detail page), so the
      // ledger stays accurate no matter where a follow-up was actually completed.
      await leadsRepository.recordFollowupHistory(
        id,
        { needsFollowup: existing.needsFollowup, followupDate: existing.followupDate, followupTime: existing.followupTime },
        { needsFollowup: updated.needsFollowup, followupDate: updated.followupDate, followupTime: updated.followupTime },
      );
    }

    return toDetail(updated);
  },

  async assign(id: string, input: AssignLeadInput, actorId: string, meta: RequestMeta): Promise<LeadDetail> {
    const existing = await leadsRepository.findById(id);
    if (!existing) throw AppError.notFound("Lead not found");

    if (input.ownerId) await assertOwnerExists(input.ownerId);

    const updated = await leadsRepository.assign(id, input.ownerId);
    await writeAuditLog({
      userId: actorId,
      action: "lead.assign",
      entityType: "Lead",
      entityId: id,
      oldValue: { ownerId: existing.ownerId },
      newValue: { ownerId: input.ownerId },
      ...meta,
    });

    io?.emit("lead:assigned", { leadIds: [id], ownerId: input.ownerId });

    return toDetail(updated);
  },

  /** Toggles the "mark as contacted" tick on the Contacted Today page -- distinct from the
   *  auto-tracked activity feed, since not every tracked action (e.g. a status edit) means an
   *  actual outreach happened that day. */
  async markContacted(
    id: string,
    input: MarkLeadContactedInput,
    actor: RequestUser,
    meta: RequestMeta,
  ): Promise<LeadDetail> {
    const existing = await leadsRepository.findById(id);
    if (!existing) throw AppError.notFound("Lead not found");

    assertOwnerOrPrivileged(existing, actor, "mark this lead as contacted");

    const updated = await leadsRepository.markContacted(id, input.contacted ? new Date() : null);
    await writeAuditLog({
      userId: actor.id,
      action: input.contacted ? "lead.contacted" : "lead.uncontacted",
      entityType: "Lead",
      entityId: id,
      ...meta,
    });

    return toDetail(updated);
  },

  async bulkAssign(input: BulkAssignLeadsInput, actorId: string, meta: RequestMeta): Promise<{ count: number }> {
    if (input.ownerId) await assertOwnerExists(input.ownerId);

    const existingLeads = await leadsRepository.findManyByIds(input.leadIds);
    const foundIds = new Set(existingLeads.map((lead) => lead.id));
    const missingIds = input.leadIds.filter((id) => !foundIds.has(id));
    if (missingIds.length > 0) {
      throw AppError.badRequest("One or more leads do not exist", { missingIds });
    }

    const { count } = await leadsRepository.bulkAssign(input.leadIds, input.ownerId);

    await Promise.all(
      existingLeads.map((lead) =>
        writeAuditLog({
          userId: actorId,
          action: "lead.assign",
          entityType: "Lead",
          entityId: lead.id,
          oldValue: { ownerId: lead.ownerId },
          newValue: { ownerId: input.ownerId },
          ...meta,
        }),
      ),
    );

    io?.emit("lead:assigned", { leadIds: input.leadIds, ownerId: input.ownerId });

    return { count };
  },

  async listNotes(id: string): Promise<LeadNote[]> {
    const existing = await leadsRepository.findById(id);
    if (!existing) throw AppError.notFound("Lead not found");

    const notes = await leadsRepository.listNotes(id);
    return notes.map((note) => ({
      id: note.id,
      leadId: id,
      body: note.body,
      userId: note.userId,
      userName: `${note.user.firstName} ${note.user.lastName}`,
      createdAt: note.createdAt.toISOString(),
    }));
  },

  async getActivity(id: string): Promise<LeadActivityEntry[]> {
    const existing = await leadsRepository.findById(id);
    if (!existing) throw AppError.notFound("Lead not found");

    const [auditEntries, notes] = await Promise.all([
      leadsRepository.listActivityAuditEntries(id),
      leadsRepository.listNotes(id),
    ]);

    const entries: LeadActivityEntry[] = [];

    for (const entry of auditEntries) {
      const userName = entry.user ? `${entry.user.firstName} ${entry.user.lastName}` : null;
      const base = { id: entry.id, occurredAt: entry.createdAt.toISOString(), userId: entry.userId, userName };

      if (entry.action === "lead.status_change") {
        const oldValue = entry.oldValue as { status?: LeadStatus } | null;
        const newValue = entry.newValue as { status?: LeadStatus } | null;
        entries.push({
          ...base,
          kind: "status_change",
          body: null,
          fromStatus: oldValue?.status ?? null,
          toStatus: newValue?.status ?? null,
        });
      } else if (entry.action === "lead.name_change") {
        const oldValue = entry.oldValue as { firstName?: string; lastName?: string } | null;
        const newValue = entry.newValue as { firstName?: string; lastName?: string } | null;
        entries.push({
          ...base,
          kind: "name_change",
          body: `changed the name from "${oldValue?.firstName} ${oldValue?.lastName}" to "${newValue?.firstName} ${newValue?.lastName}"`,
          fromStatus: null,
          toStatus: null,
        });
      } else if (entry.action === "lead.followup_change") {
        const oldValue = entry.oldValue as FollowupAuditValue | null;
        const newValue = entry.newValue as FollowupAuditValue | null;
        entries.push({
          ...base,
          kind: "followup_change",
          body: formatFollowupChange(oldValue, newValue),
          fromStatus: null,
          toStatus: null,
        });
      }
    }

    for (const note of notes) {
      entries.push({
        id: note.id,
        kind: "note",
        occurredAt: note.createdAt.toISOString(),
        userId: note.userId,
        userName: `${note.user.firstName} ${note.user.lastName}`,
        body: note.body,
        fromStatus: null,
        toStatus: null,
      });
    }

    entries.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
    return entries;
  },

  async addNote(id: string, input: CreateLeadNoteInput, actor: RequestUser, meta: RequestMeta): Promise<LeadNote> {
    const existing = await leadsRepository.findById(id);
    if (!existing) throw AppError.notFound("Lead not found");

    assertOwnerOrPrivileged(existing, actor, "manage this lead's notes");

    const note = await leadsRepository.createNote(id, actor.id, input.body);
    await writeAuditLog({
      userId: actor.id,
      action: "lead.note_create",
      entityType: "Lead",
      entityId: id,
      newValue: { body: input.body },
      ...meta,
    });

    const result: LeadNote = {
      id: note.id,
      leadId: id,
      body: note.body,
      userId: note.userId,
      userName: `${note.user.firstName} ${note.user.lastName}`,
      createdAt: note.createdAt.toISOString(),
    };

    io?.emit("lead:note_created", { leadId: id, note: result });

    return result;
  },

  async updateNote(
    id: string,
    noteId: string,
    input: CreateLeadNoteInput,
    actor: RequestUser,
    meta: RequestMeta,
  ): Promise<LeadNote> {
    const existingLead = await leadsRepository.findById(id);
    if (!existingLead) throw AppError.notFound("Lead not found");

    assertOwnerOrPrivileged(existingLead, actor, "manage this lead's notes");

    const existingNote = await leadsRepository.findNoteById(noteId);
    if (!existingNote || existingNote.leadId !== id) throw AppError.notFound("Note not found");

    const updated = await leadsRepository.updateNote(noteId, input.body);
    await writeAuditLog({
      userId: actor.id,
      action: "lead.note_update",
      entityType: "Lead",
      entityId: id,
      oldValue: { body: existingNote.body },
      newValue: { body: input.body },
      ...meta,
    });

    const result: LeadNote = {
      id: updated.id,
      leadId: id,
      body: updated.body,
      userId: updated.userId,
      userName: `${updated.user.firstName} ${updated.user.lastName}`,
      createdAt: updated.createdAt.toISOString(),
    };

    io?.emit("lead:note_updated", { leadId: id, note: result });

    return result;
  },

  async convert(id: string, actorId: string, meta: RequestMeta): Promise<LeadDetail> {
    const existing = await leadsRepository.findById(id);
    if (!existing) throw AppError.notFound("Lead not found");
    if (existing.convertedContactId) throw AppError.badRequest("Lead has already been converted");

    const { contactId } = await leadsRepository.convertToContact(
      id,
      {
        firstName: existing.firstName,
        lastName: existing.lastName || "Unknown",
        email: existing.email,
        phone: existing.phone,
        jobTitle: existing.jobTitle,
        ownerId: existing.ownerId,
      },
      existing.company,
    );

    await writeAuditLog({
      userId: actorId,
      action: "lead.convert",
      entityType: "Lead",
      entityId: id,
      newValue: { contactId },
      ...meta,
    });

    // Conversion no longer forces status to a "CONVERTED" value (see convertToContact) --
    // still emitted so connected clients invalidate/refetch this lead, just with its real
    // (unchanged) status rather than a value that no longer exists in the enum.
    io?.emit("lead:status_changed", { leadId: id, status: existing.status });

    const updated = await leadsRepository.findById(id);
    return toDetail(updated!);
  },

  async remove(id: string, actorId: string, meta: RequestMeta): Promise<void> {
    const existing = await leadsRepository.findById(id);
    if (!existing) throw AppError.notFound("Lead not found");

    await leadsRepository.delete(id);
    await writeAuditLog({
      userId: actorId,
      action: "lead.delete",
      entityType: "Lead",
      entityId: id,
      oldValue: { firstName: existing.firstName, lastName: existing.lastName },
      ...meta,
    });
  },
};
