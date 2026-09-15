export type KycStatus = "PENDING" | "VERIFIED" | "REJECTED";

export interface ContactSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  jobTitle: string | null;
  kycStatus: KycStatus;
  companyId: string | null;
  companyName: string | null;
  ownerId: string | null;
  ownerName: string | null;
  createdAt: string;
}

export interface ContactDetail extends ContactSummary {
  updatedAt: string;
}
