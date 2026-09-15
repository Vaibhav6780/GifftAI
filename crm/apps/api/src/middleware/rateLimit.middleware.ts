import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { redisClient } from "../config/redis";
import { AppError } from "../lib/apiError";

function redisRateLimitStore(prefix: string) {
  return new RedisStore({
    prefix,
    sendCommand: (command: string, ...args: string[]) => redisClient.call(command, ...args) as Promise<never>,
  });
}

/** Tight limiter for credential-guessing-prone endpoints (login, forgot-password). */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: redisRateLimitStore("rl:auth:"),
  handler: (_req, _res, next) => next(AppError.tooManyRequests()),
});

/** General API limiter as a baseline defense-in-depth measure. */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  store: redisRateLimitStore("rl:api:"),
  handler: (_req, _res, next) => next(AppError.tooManyRequests()),
});

/** Public website contact-form endpoint — no auth, so this is the primary abuse guard. */
export const formLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  store: redisRateLimitStore("rl:form:"),
  handler: (_req, _res, next) => next(AppError.tooManyRequests()),
});

/** Platform webhooks (Meta/Telegram) — generous, since these are legitimate-source bursts;
 *  this is a backstop against a misconfigured/malicious sender, not the primary defense
 *  (signature verification is). */
export const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 600,
  standardHeaders: true,
  legacyHeaders: false,
  store: redisRateLimitStore("rl:webhook:"),
  handler: (_req, _res, next) => next(AppError.tooManyRequests()),
});
