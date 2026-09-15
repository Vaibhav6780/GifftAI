export type LeadStatus = "NEW" | "HOT" | "WARM" | "COLD" | "LOST";

/** Which product this lead belongs to — keep in sync with LeadBrand in schema.prisma and
 *  leadBrandSchema in schemas/leads.schema.ts. GIFTTAI is primary for this CRM. */
export type LeadBrand = "GIFTTAI" | "SWISDEX";

export interface LeadSourceOption {
  id: string;
  name: string;
}

export interface LeadSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  jobTitle: string | null;
  status: LeadStatus;
  score: number;
  value: number | null;
  sourceId: string | null;
  sourceName: string | null;
  ownerId: string | null;
  ownerName: string | null;
  needsFollowup: boolean;
  followupDate: string | null;
  /** Optional "HH:mm" time-of-day for the follow-up; null means no time was given (date-only). */
  followupTime: string | null;
  convertedContactId: string | null;
  createdAt: string;
  brand: LeadBrand;
}

export interface LeadDetail extends LeadSummary {
  description: string | null;
  updatedAt: string;
}

export type LeadStatusCounts = Record<LeadStatus, number>;

/** A lead row for the "Contacted Today" page — same shape as `LeadSummary` plus the single
 *  most recent tracked activity/change on the selected date (whichever of status/name/
 *  follow-up/note/assign/message/etc. happened last), so a lead with several actions that
 *  day still appears exactly once. */
export interface LeadContactedSummary extends LeadSummary {
  latestActivityAt: string;
  latestActivityLabel: string;
  /** Set when this lead was marked "contacted" (via the tick-mark button) on the date this
   *  summary was requested for; null if it wasn't marked that day. */
  contactedAt: string | null;
}

/** A lead row for the "Follow-ups Due" page — same shape as `LeadSummary` plus the specific
 *  `LeadFollowup` history row being shown, so completion state is persistent and tied to a
 *  specific due date rather than to whatever `Lead.needsFollowup`/`followupDate` say right
 *  now (those only ever reflect the current/latest engagement). */
export interface LeadFollowupSummary extends LeadSummary {
  followupId: string;
  dueDate: string;
  /** Optional "HH:mm" time-of-day for this engagement's due date; null if none was set. */
  dueTime: string | null;
  completedAt: string | null;
}

export interface LeadNote {
  id: string;
  leadId: string;
  body: string;
  userId: string;
  userName: string;
  createdAt: string;
}

/** Merged, timestamped history of a lead's status changes, name edits, follow-up changes,
 *  and notes. `body` carries the note text for "note" entries and a pre-formatted
 *  human-readable summary (built server-side) for "name_change"/"followup_change" entries —
 *  only "status_change" uses the dedicated fromStatus/toStatus fields, since those are
 *  useful as a typed enum rather than just display text. */
export interface LeadActivityEntry {
  id: string;
  kind: "status_change" | "name_change" | "followup_change" | "note";
  occurredAt: string;
  userId: string | null;
  userName: string | null;
  body: string | null;
  fromStatus: LeadStatus | null;
  toStatus: LeadStatus | null;
}
