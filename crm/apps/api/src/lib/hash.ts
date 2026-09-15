import bcrypt from "bcryptjs";
import crypto from "node:crypto";

const BCRYPT_ROUNDS = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Generates an opaque, URL-safe random token (refresh / password-reset tokens). */
export function generateOpaqueToken(): string {
  return crypto.randomBytes(48).toString("base64url");
}

/** SHA-256 hash of an opaque token, for at-rest storage — never store the raw token. */
export function hashOpaqueToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
