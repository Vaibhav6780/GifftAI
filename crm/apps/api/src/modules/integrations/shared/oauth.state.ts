import crypto from "node:crypto";
import { redisClient } from "../../../config/redis";

const STATE_TTL_SECONDS = 600; // 10 minutes to complete the OAuth redirect round trip

/** Redis-backed CSRF state for OAuth authorization-code flows — shared by Instagram and
 *  LinkedIn since both need the same "generate opaque state, verify+consume it once on
 *  callback" mechanism. `purpose` namespaces keys per platform (and avoids reuse).
 *
 *  Carries a small JSON payload (e.g. the connecting admin's userId) because the OAuth
 *  callback is a public, unauthenticated redirect from the browser — there's no session
 *  to recover that from otherwise. */
export const oauthState = {
  async create(purpose: string, payload: Record<string, unknown> = {}): Promise<string> {
    const state = crypto.randomBytes(24).toString("hex");
    await redisClient.set(`oauth:state:${purpose}:${state}`, JSON.stringify(payload), "EX", STATE_TTL_SECONDS);
    return state;
  },

  /** Single-use: deletes the key so the same state can't be replayed. Returns null if the
   *  state is unknown/expired/already consumed. */
  async consume<T = Record<string, unknown>>(purpose: string, state: string): Promise<T | null> {
    const key = `oauth:state:${purpose}:${state}`;
    const raw = await redisClient.get(key);
    if (raw === null) return null;
    await redisClient.del(key);
    return JSON.parse(raw) as T;
  },
};
