import { create } from "zustand";
import type { AuthUser } from "@gifftai/shared";

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  /** Access token is kept in memory only (never persisted) to limit XSS blast radius. */
  setSession: (user: AuthUser, accessToken: string) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  setSession: (user, accessToken) => set({ user, accessToken }),
  clearSession: () => set({ user: null, accessToken: null }),
}));
