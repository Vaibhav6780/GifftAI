export type TradingStatus = "active" | "inactive";
export type AccountStatus = "active" | "dormant" | "suspended";
export type KycStatus = "verified" | "pending" | "rejected";

export interface ConvertedUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  registrationDate: string;
  kycStatus: KycStatus;
  tradingStatus: TradingStatus;
  totalTrades: number;
  totalDeposits: number;
  totalWithdrawals: number;
  accountStatus: AccountStatus;
  lastActiveDate: string;
}

export type StakingStatus = "active";

export interface AiStakingEntry {
  id: string;
  investor: string;
  email: string;
  country: string;
  amount: number;
  stakingDate: string;
  status: StakingStatus;
}
