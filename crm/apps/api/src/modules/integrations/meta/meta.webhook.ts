import crypto from "node:crypto";
import type { Request, Response } from "express";
import { env } from "../../../config/env";

/**
 * Shared by WhatsApp Cloud API and Instagram Messaging — both are Meta Graph API products
 * behind the same webhook verification handshake and HMAC signature scheme, so this is
 * written once rather than duplicated per platform.
 */

/** Meta's one-time GET verification handshake when a webhook URL is registered/changed. */
export function handleMetaVerificationChallenge(req: Request, res: Response): void {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && env.META_WEBHOOK_VERIFY_TOKEN && token === env.META_WEBHOOK_VERIFY_TOKEN) {
    res.status(200).send(String(challenge ?? ""));
    return;
  }
  res.status(403).end();
}

/** Verifies X-Hub-Signature-256, an HMAC-SHA256 over the exact request bytes (req.rawBody,
 *  captured in app.ts) — this is the primary defense for these public endpoints. */
export function verifyMetaSignature(req: Request): boolean {
  if (!env.META_APP_SECRET || !req.rawBody) return false;

  const signatureHeader = req.header("x-hub-signature-256");
  if (!signatureHeader?.startsWith("sha256=")) return false;

  const expected = `sha256=${crypto.createHmac("sha256", env.META_APP_SECRET).update(req.rawBody).digest("hex")}`;

  const provided = Buffer.from(signatureHeader);
  const expectedBuf = Buffer.from(expected);
  if (provided.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(provided, expectedBuf);
}
