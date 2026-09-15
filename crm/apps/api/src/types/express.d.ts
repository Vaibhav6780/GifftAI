import type { AuthUser } from "@gifftai/shared";

export type RequestUser = AuthUser;

declare global {
  namespace Express {
    interface Request {
      id: string;
      user?: RequestUser;
      /** Raw request body bytes, captured by express.json()'s verify hook in app.ts —
       *  needed to verify Meta's X-Hub-Signature-256 HMAC, which is computed over the
       *  exact bytes on the wire rather than the re-serialized parsed JSON. */
      rawBody?: Buffer;
    }
  }
}
