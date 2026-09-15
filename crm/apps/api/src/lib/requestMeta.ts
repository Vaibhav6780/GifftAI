import type { Request } from "express";

export interface RequestMeta {
  userAgent?: string;
  ipAddress?: string;
}

export function requestMeta(req: Request): RequestMeta {
  return { userAgent: req.header("user-agent"), ipAddress: req.ip };
}
