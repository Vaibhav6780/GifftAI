import Redis from "ioredis";
import { env } from "./env";
import { logger } from "./logger";

/** General-purpose client: rate limiting, caching, pub/sub. */
export const redisClient = new Redis(env.REDIS_URL, { lazyConnect: false });

/** BullMQ requires its own connection with maxRetriesPerRequest disabled. */
export const bullmqConnection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });

redisClient.on("error", (error) => logger.error({ error }, "Redis client error"));
bullmqConnection.on("error", (error) => logger.error({ error }, "Redis (BullMQ) connection error"));
