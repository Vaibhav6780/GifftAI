import type {
  RmEntry,
  RmFundingRequestSummary,
  RmManualRequestSummary,
  RmFundingRequestStatus,
  RmManualRequestStatus,
} from "@gifftai/shared";
import * as websiteAdmin from "./websiteAdminClient";
import type { RmEntryDto, RmFundingRequestDto, RmManualRequestDto } from "./websiteAdminClient";

function toFundingRequest(dto: RmFundingRequestDto): RmFundingRequestSummary {
  return {
    id: dto.id,
    rmId: dto.rm_id,
    rmName: dto.rm_name,
    userId: dto.user_id,
    userName: dto.user_name,
    userEmail: dto.user_email,
    amount: dto.amount,
    currency: dto.currency,
    method: dto.method,
    note: dto.note,
    hasProof: dto.has_proof,
    status: dto.status as RmFundingRequestStatus,
    approvedBy: dto.approved_by,
    approvedAt: dto.approved_at,
    creditedBy: dto.credited_by,
    creditedAt: dto.credited_at,
    rejectionReason: dto.rejection_reason,
    createdAt: dto.created_at,
  };
}

function toManualRequest(dto: RmManualRequestDto): RmManualRequestSummary {
  return {
    id: dto.id,
    userId: dto.user_id,
    userName: dto.user_name,
    userEmail: dto.user_email,
    side: dto.side as "deposit" | "withdraw",
    amount: dto.amount,
    method: dto.method,
    phone: dto.phone,
    payoutDetails: dto.payout_details,
    note: dto.note,
    status: dto.status as RmManualRequestStatus,
    createdAt: dto.created_at,
  };
}

function toRmEntry(dto: RmEntryDto): RmEntry {
  return { id: dto.id, name: dto.name, email: dto.email };
}

export const rmRequestsService = {
  isConfigured(): boolean {
    return websiteAdmin.isRmRequestsConfigured();
  },

  async listFundingRequests(actorEmail: string, status?: string): Promise<RmFundingRequestSummary[]> {
    const rows = await websiteAdmin.listFundingRequests(actorEmail, status);
    return rows.map(toFundingRequest);
  },

  async approveFundingRequest(actorEmail: string, id: string) {
    return websiteAdmin.approveFundingRequest(actorEmail, id);
  },

  async creditFundingRequest(actorEmail: string, id: string) {
    return websiteAdmin.creditFundingRequest(actorEmail, id);
  },

  async rejectFundingRequest(actorEmail: string, id: string, reason: string) {
    return websiteAdmin.rejectFundingRequest(actorEmail, id, reason);
  },

  async getFundingProof(actorEmail: string, id: string) {
    return websiteAdmin.getFundingProof(actorEmail, id);
  },

  async listManualRequests(actorEmail: string, status?: string): Promise<RmManualRequestSummary[]> {
    const rows = await websiteAdmin.listManualRequests(actorEmail, status);
    return rows.map(toManualRequest);
  },

  async setManualRequestStatus(actorEmail: string, id: string, status: string) {
    return websiteAdmin.setManualRequestStatus(actorEmail, id, status);
  },

  async listRms(actorEmail: string): Promise<RmEntry[]> {
    const rows = await websiteAdmin.listRms(actorEmail);
    return rows.map(toRmEntry);
  },

  async assignUserToRm(actorEmail: string, userId: string, rmId: string | null) {
    return websiteAdmin.assignUserToRm(actorEmail, userId, rmId);
  },
};
