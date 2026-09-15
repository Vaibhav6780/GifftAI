import type { LeadBrand, LeadStatus } from "@gifftai/shared";

export const STATUS_OPTIONS: LeadStatus[] = ["NEW", "HOT", "WARM", "COLD", "LOST"];

// Which product a lead belongs to -- drives the Brand filter/column on the Leads,
// Follow-ups, and Contacted Today pages, and the "Gifttai" sidebar section (same pages,
// same logic, just pre-filtered to brand=GIFTTAI).
export const BRAND_OPTIONS: LeadBrand[] = ["SWISDEX", "GIFTTAI"];

export const BRAND_LABEL: Record<LeadBrand, string> = {
  SWISDEX: "GifftAI",
  GIFTTAI: "Gifttai",
};

export const BRAND_VARIANT: Record<LeadBrand, "info" | "success"> = {
  SWISDEX: "info",
  GIFTTAI: "success",
};

// Single source of truth for how a status renders — every Badge/Select showing a lead
// status across the app (Leads list, Lead detail, Contacted Today, Follow-ups, dashboard
// tiles/cards, Assigned Leads table) reads from this instead of the raw enum value, so the
// emoji/label stays consistent everywhere.
export const STATUS_LABEL: Record<LeadStatus, string> = {
  NEW: "New",
  HOT: "🔥 Hot",
  WARM: "🟡 Warm",
  COLD: "❄️ Cold",
  LOST: "❌ Lost",
};

// Literal colors per the product spec: NEW=White, HOT=Red, WARM=Yellow, COLD=Blue,
// LOST=Dark Gray — not the Badge component's generic success/warning/danger semantics.
export const STATUS_VARIANT: Record<LeadStatus, "white" | "danger" | "yellow" | "blue" | "charcoal"> = {
  NEW: "white",
  HOT: "danger",
  WARM: "yellow",
  COLD: "blue",
  LOST: "charcoal",
};

// Same literal colors as STATUS_VARIANT, applied to a whole table row rather than just the
// badge chip -- pass to <Tr className={STATUS_ROW_TINT[lead.status]}>. `!` (important) is
// required because Table.tsx's <Tr> already ships its own bg-white/dark:bg-slate-900 (and
// hover) classes, and Tailwind's cascade doesn't reliably let a later className win over an
// earlier one of equal specificity -- `!bg-*` guarantees the tint always applies regardless
// of utility-generation order. NEW has no override: white is already <Tr>'s default.
export const STATUS_ROW_TINT: Record<LeadStatus, string> = {
  NEW: "",
  HOT: "!bg-red-50 hover:!bg-red-100 dark:!bg-red-950/40 dark:hover:!bg-red-950/60",
  WARM: "!bg-yellow-50 hover:!bg-yellow-100 dark:!bg-yellow-950/30 dark:hover:!bg-yellow-950/50",
  COLD: "!bg-blue-50 hover:!bg-blue-100 dark:!bg-blue-950/30 dark:hover:!bg-blue-950/50",
  LOST: "!bg-slate-200 hover:!bg-slate-300 dark:!bg-slate-800/80 dark:hover:!bg-slate-800",
};
