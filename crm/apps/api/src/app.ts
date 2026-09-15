import express, { type Express, type Request } from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import type { ApiResponse } from "@gifftai/shared";
import { env, isProduction } from "./config/env";
import { logger } from "./config/logger";
import { requestId } from "./middleware/requestId.middleware";
import { apiLimiter } from "./middleware/rateLimit.middleware";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";
import { authRouter } from "./modules/auth/auth.routes";
import { usersRouter } from "./modules/users/users.routes";
import { rolesRouter } from "./modules/roles/roles.routes";
import { departmentsRouter } from "./modules/departments/departments.routes";
import { permissionsRouter } from "./modules/permissions/permissions.routes";
import { leadsRouter } from "./modules/leads/leads.routes";
import { leadSourcesRouter } from "./modules/lead-sources/lead-sources.routes";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes";
import { companiesRouter } from "./modules/companies/companies.routes";
import { contactsRouter } from "./modules/contacts/contacts.routes";
import { tasksRouter } from "./modules/tasks/tasks.routes";
import { attendanceRouter } from "./modules/attendance/attendance.routes";
import { attendanceRequestsRouter } from "./modules/attendanceRequests/attendanceRequests.routes";
import { dailyReportsRouter } from "./modules/dailyReports/dailyReports.routes";
import { auditRouter } from "./modules/audit/audit.routes";
import { ticketsRouter } from "./modules/tickets/tickets.routes";
import { rmRequestsRouter } from "./modules/rm-requests/rmRequests.routes";
import { blogRouter } from "./modules/blog/blog.routes";
import { publicIntegrationsRouter } from "./modules/integrations/public/public.routes";
import { integrationsAdminRouter } from "./modules/integrations/admin/integrations-admin.routes";

export function createApp(): Express {
  const app = express();

  if (isProduction) {
    // Two real proxy hops sit between the client and this app in prod: the
    // outer gifftai_official_web nginx (which already resolves Cloudflare's
    // real client IP via real_ip_header CF-Connecting-IP, then re-appends it
    // to X-Forwarded-For) and this repo's own internal CRM nginx container
    // (web -> api). Trusting only 1 hop made req.ip resolve to the outer
    // nginx's constant loopback address for every request, so every distinct
    // client shared one express-rate-limit bucket — a handful of login
    // attempts from anyone tripped the 10-per-15-min authLimiter for everyone.
    app.set("trust proxy", 2);
  }

  app.use(helmet());
  app.use(
    cors({
      origin: env.WEB_URL,
      credentials: true,
    }),
  );
  app.use(cookieParser());
  app.use(
    express.json({
      limit: "1mb",
      // Meta webhook signatures (X-Hub-Signature-256) are an HMAC over the exact bytes on
      // the wire — capture them here rather than splitting body-parser setup by path, so
      // every route (public or authenticated) gets the same parser in the same order.
      verify: (req, _res, buf) => {
        (req as Request & { rawBody?: Buffer }).rawBody = buf;
      },
    }),
  );
  app.use(requestId);
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => req.id,
      autoLogging: { ignore: (req) => req.url === "/health" },
    }),
  );

  app.get("/health", (_req, res) => {
    const body: ApiResponse<{ status: "ok" }> = { success: true, data: { status: "ok" } };
    res.status(200).json(body);
  });

  // Unauthenticated lead-ingestion endpoints (contact form, platform webhooks, OAuth
  // callbacks) — mounted above apiLimiter so they get their own purpose-built limiters
  // (formLimiter/webhookLimiter) instead of the authenticated-API baseline, and never
  // gets requireAuth applied, unlike every other router under /api.
  // Mounted under /api/public (not bare /public) so it lines up with this repo's own
  // internal nginx (docker/nginx/nginx.conf), which only proxies /api/* to this
  // service — a bare /public/* request never reaches Express at all in prod, it falls
  // through nginx's SPA catch-all and 405s as a static file. Confirmed unreachable via
  // curl against the live crm.gifftai.com before this fix.
  app.use("/api/public", publicIntegrationsRouter);

  app.use(apiLimiter);

  app.use("/api/auth", authRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/roles", rolesRouter);
  app.use("/api/departments", departmentsRouter);
  app.use("/api/permissions", permissionsRouter);
  app.use("/api/leads", leadsRouter);
  app.use("/api/lead-sources", leadSourcesRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/companies", companiesRouter);
  app.use("/api/contacts", contactsRouter);
  app.use("/api/tasks", tasksRouter);
  app.use("/api/attendance", attendanceRouter);
  app.use("/api/attendance-requests", attendanceRequestsRouter);
  app.use("/api/daily-reports", dailyReportsRouter);
  app.use("/api/integrations", integrationsAdminRouter);
  app.use("/api/audit", auditRouter);
  app.use("/api/tickets", ticketsRouter);
  app.use("/api/rm-requests", rmRequestsRouter);
  app.use("/api/blog", blogRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
