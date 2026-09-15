export interface CompanySummary {
  id: string;
  name: string;
  domain: string | null;
  industry: string | null;
  size: string | null;
  website: string | null;
  phone: string | null;
  ownerId: string | null;
  ownerName: string | null;
  createdAt: string;
}

export interface CompanyDetail extends CompanySummary {
  description: string | null;
  updatedAt: string;
}

export interface CompanyOption {
  id: string;
  name: string;
}
