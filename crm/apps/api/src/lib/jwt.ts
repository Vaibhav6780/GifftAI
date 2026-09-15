import jwt from "jsonwebtoken";
import { env } from "../config/env";

export interface AccessTokenPayload {
  sub: string; // userId
}

export function signAccessToken(userId: string): string {
  return jwt.sign({ sub: userId } satisfies AccessTokenPayload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

/** Decodes the access token's expiry as an ISO string, for the login response payload. */
export function getAccessTokenExpiryIso(token: string): string {
  const decoded = jwt.decode(token) as { exp?: number } | null;
  if (!decoded?.exp) return new Date().toISOString();
  return new Date(decoded.exp * 1000).toISOString();
}
