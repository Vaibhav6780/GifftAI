import type { PermissionKey } from "../constants/permissions.js";

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  roles: string[];
  permissions: PermissionKey[];
}

export interface AuthTokens {
  accessToken: string;
  accessTokenExpiresAt: string;
}

export interface LoginResult {
  user: AuthUser;
  tokens: AuthTokens;
}
