import type { Server as HttpServer } from "node:http";
import { Server, type Socket } from "socket.io";
import { verifyAccessToken } from "../lib/jwt";
import { loadRequestUser } from "../lib/loadRequestUser";
import { env } from "../config/env";
import { logger } from "../config/logger";

declare module "socket.io" {
  interface Socket {
    userId: string;
  }
}

/**
 * Module-level singleton so services (e.g. leads.service.ts) can emit feature events
 * without needing httpServer threaded through their constructors. Undefined until
 * createSocketServer runs at boot (server.ts) — every emit call-site must use `io?.emit`
 * so code paths that never boot the HTTP server (tests, scripts) don't crash. ES module
 * live bindings mean importers see the assignment below once it happens, even though
 * they imported this module before createSocketServer was called.
 */
export let io: Server | undefined;

/**
 * Authenticates the handshake and joins a per-user room (`user:<id>`) — kept for future
 * targeted (non-broadcast) events. Current feature events (lead:assigned,
 * lead:status_changed, lead:note_created, lead:note_updated — see leads.service.ts) are
 * broadcast to every connected socket rather than room-scoped: this is an internal
 * sales-team tool, not high-scale, so the simplicity of a global emit outweighs the
 * complexity of per-lead room subscriptions for a first pass.
 */
export function createSocketServer(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: { origin: env.WEB_URL, credentials: true },
  });

  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) throw new Error("Missing auth token");

      const { sub: userId } = verifyAccessToken(token);
      const user = await loadRequestUser(userId);
      if (!user) throw new Error("Account is inactive or no longer exists");

      socket.userId = userId;
      next();
    } catch (error) {
      next(error instanceof Error ? error : new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(`user:${socket.userId}`);
    logger.info({ socketId: socket.id, userId: socket.userId }, "Socket connected");

    socket.emit("connected", { userId: socket.userId });

    socket.on("disconnect", () => {
      logger.info({ socketId: socket.id, userId: socket.userId }, "Socket disconnected");
    });
  });

  return io;
}
