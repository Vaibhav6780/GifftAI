import type { RmFundingRequestStatus, RmManualRequestStatus } from "../schemas/rmRequests.schema.js";

/** Camel-cased views of gifftai_official_web's `/rm/*` admin API responses — that
 *  system's Postgres is the source of truth, this repo never persists these rows. */

export interface RmFundingRequestSummary {
  id: string;
  rmId: string;
  rmName: string;
  userId: string;
  userName: string;
  userEmail: string | null;
  amount: number;
  currency: string;
  method: string | null;
  note: string | null;
  hasProof: boolean;
  status: RmFundingRequestStatus;
  approvedBy: string | null;
  approvedAt: string | null;
  creditedBy: string | null;
  creditedAt: string | null;
  rejectionReason: string | null;
  createdAt: string | null;
}

export interface RmManualRequestSummary {
  id: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  side: "deposit" | "withdraw";
  amount: number;
  method: string | null;
  phone: string | null;
  payoutDetails: string | null;
  note: string | null;
  status: RmManualRequestStatus;
  createdAt: string | null;
}

export interface RmEntry {
  id: string;
  name: string;
  email: string | null;
}

export interface RmRequestsConnectionStatus {
  connected: boolean;
}
