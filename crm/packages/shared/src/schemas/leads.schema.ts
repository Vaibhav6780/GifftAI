import { z } from "zod";

const cuid = z.string().cuid();
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
const timeOnly = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm");

export const leadStatusSchema = z.enum(["NEW", "HOT", "WARM", "COLD", "LOST"]);
export type LeadStatusInput = z.infer<typeof leadStatusSchema>;

// Which product this lead belongs to — keep in sync with LeadBrand in schema.prisma and
// leads.ts. GIFTTAI is the primary brand for this CRM; SWISDEX retained for compatibility.
export const leadBrandSchema = z.enum(["GIFTTAI", "SWISDEX"]);
export type LeadBrandInput = z.infer<typeof leadBrandSchema>;

export const createLeadSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Enter a valid email address").optional(),
  phone: z.string().max(30).optional(),
  company: z.string().max(150).optional(),
  jobTitle: z.string().max(150).optional(),
  status: leadStatusSchema.optional(),
  score: z.coerce.number().int().min(0).max(100).optional(),
  value: z.coerce.number().nonnegative().optional(),
  description: z.string().max(2000).optional(),
  sourceId: cuid.nullable().optional(),
  ownerId: cuid.nullable().optional(),
  // Defaults to GIFTTAI server-side (matches the column default) when omitted.
  brand: leadBrandSchema.optional(),
});
export type CreateLeadInput = z.infer<typeof createLeadSchema>;

export const updateLeadSchema = z.object({
  // Blank is allowed — the edit form lets a rep clear the name/email instead of forcing a
  // placeholder value. firstName/lastName are non-nullable columns, so "" is stored as-is;
  // email is nullable, so "" is normalized to null to actually clear it.
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  email: z.preprocess(
    (v) => (v === "" ? null : v),
    z.string().email("Enter a valid email address").nullable().optional(),
  ),
  phone: z.string().max(30).nullable().optional(),
  company: z.string().max(150).nullable().optional(),
  jobTitle: z.string().max(150).nullable().optional(),
  status: leadStatusSchema.optional(),
  score: z.coerce.number().int().min(0).max(100).optional(),
  value: z.coerce.number().nonnegative().nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  sourceId: cuid.nullable().optional(),
  needsFollowup: z.boolean().optional(),
  followupDate: z.string().datetime().nullable().optional(),
  // Optional time-of-day for the follow-up ("HH:mm") -- follow-up date stays required
  // wherever needsFollowup is true, this is purely an add-on. Kept as a separate field
  // rather than folded into followupDate so "no time given" (null) stays distinguishable
  // from "explicitly midnight".
  followupTime: timeOnly.nullable().optional(),
});
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;

export const assignLeadSchema = z.object({
  ownerId: cuid.nullable(),
});
export type AssignLeadInput = z.infer<typeof assignLeadSchema>;

export const bulkAssignLeadsSchema = z.object({
  leadIds: z.array(cuid).min(1, "Select at least one lead"),
  ownerId: cuid.nullable(),
});
export type BulkAssignLeadsInput = z.infer<typeof bulkAssignLeadsSchema>;

export const createLeadNoteSchema = z.object({
  body: z.string().min(1, "Note cannot be empty").max(2000),
});
export type CreateLeadNoteInput = z.infer<typeof createLeadNoteSchema>;

export const markLeadContactedSchema = z.object({
  contacted: z.boolean(),
});
export type MarkLeadContactedInput = z.infer<typeof markLeadContactedSchema>;

export const listLeadsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().max(200).optional(),
  status: leadStatusSchema.optional(),
  sourceId: cuid.optional(),
  ownerId: cuid.optional(),
  brand: leadBrandSchema.optional(),
  // All leads flagged for follow-up, due/overdue and upcoming alike — the caller sorts by
  // followupDate to put soonest/most-overdue first (see LeadFollowupsDuePage.tsx).
  needsFollowup: z.coerce.boolean().optional(),
  /** Restricts to leads created on this calendar day (UTC). */
  createdDate: dateOnly.optional(),
  /** Restricts to leads whose follow-up falls on this calendar day (UTC) — the Follow-ups
   *  Due page's optional date filter, on top of its always-on needsFollowup:true. */
  followupDate: dateOnly.optional(),
  sortBy: z.enum(["firstName", "lastName", "company", "score", "value", "createdAt", "followupDate"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
export type ListLeadsQuery = z.infer<typeof listLeadsQuerySchema>;

export const exportLeadsQuerySchema = listLeadsQuerySchema.omit({ page: true, pageSize: true });
export type ExportLeadsQuery = z.infer<typeof exportLeadsQuerySchema>;

// Deliberately omits `status` (unlike exportLeadsQuerySchema) -- the stats endpoint always
// returns the full per-status breakdown under whatever other filters are active, so the
// Leads page's stat tiles can show every status's count regardless of which one (if any)
// is currently selected as the active filter.
export const leadsStatsQuerySchema = listLeadsQuerySchema.omit({
  page: true,
  pageSize: true,
  sortBy: true,
  sortOrder: true,
  status: true,
});
export type LeadsStatsQuery = z.infer<typeof leadsStatsQuerySchema>;

// "Follow-ups Due" page — queries the persistent LeadFollowup history table (not Lead
// directly), so completion state is date-aware and survives past what Lead.needsFollowup/
// followupDate currently say. No sortBy — always soonest/most-overdue first by
// followupDate, matching the page's existing convention.
export const listLeadFollowupsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().max(200).optional(),
  status: leadStatusSchema.optional(),
  ownerId: cuid.optional(),
  brand: leadBrandSchema.optional(),
  /** Restricts to follow-up engagements due on this calendar day (UTC). Absent = every due
   *  date (the page's "All dates" escape hatch). */
  followupDate: dateOnly.optional(),
  /** "yes" = completedAt set, "no" = still open, absent = both. */
  completed: z.enum(["yes", "no"]).optional(),
});
export type ListLeadFollowupsQuery = z.infer<typeof listLeadFollowupsQuerySchema>;

// "Contacted Today" page — leads with any tracked activity/change (calls, emails, messages,
// status/stage changes, edits, notes, owner changes) on a given calendar day. No sortBy —
// always sorted by that day's latest activity time, newest first.
export const contactedLeadsQuerySchema = z.object({
  date: dateOnly,
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().max(200).optional(),
  status: leadStatusSchema.optional(),
  sourceId: cuid.optional(),
  ownerId: cuid.optional(),
  brand: leadBrandSchema.optional(),
  /** Restricts to leads marked "contacted" (or left unmarked) for this specific `date`, via
   *  the tick-mark button -- see `contactedAt` on `LeadContactedSummary`. */
  contacted: z.enum(["yes", "no"]).optional(),
});
export type ContactedLeadsQuery = z.infer<typeof contactedLeadsQuerySchema>;
