import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  API_URL: z.string().url().default("http://localhost:4000"),
  WEB_URL: z.string().url().default("http://localhost:5173"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),

  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  // Refresh tokens are opaque random strings validated via hashed DB lookup (not JWTs) —
  // rotation/revocation must always be authoritative from the DB, so a signature adds
  // no value and would just be a second secret to manage.
  REFRESH_TOKEN_EXPIRES_IN_DAYS: z.coerce.number().int().positive().default(30),
  RESET_TOKEN_EXPIRES_IN_MINUTES: z.coerce.number().int().positive().default(30),

  COOKIE_DOMAIN: z.string().optional(),

  // Comma-separated public IP(s) of the office network(s), e.g. "203.0.113.10,203.0.113.11".
  // Presence/Attendance (apps/api/src/modules/presence, .../attendance) uses this to tell
  // Office apart from Remote and as one of the 3 conditions for "Online". Empty by default
  // so a fresh environment never falsely reports anyone as in-office — must be configured
  // explicitly. For local dev, include "127.0.0.1" and "::1" to test the Office path.
  OFFICE_PUBLIC_IPS: z
    .string()
    .default("")
    .transform((v) =>
      v
        .split(",")
        .map((ip) => ip.trim())
        .filter(Boolean),
    ),

  // Fixed 24-hour "HH:mm" IST wall-clock time the one-time Overtime Extension ("Extend
  // Hours" button) extends an open session's exit time to — see attendance.service.ts's
  // extendOvertime. Admin-configured, not chosen per-request by the employee.
  OVERTIME_EXTENSION_TIME: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm (24-hour)").default("20:00"),

  SMTP_HOST: z.string().default("localhost"),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default("GifftAI CRM <no-reply@gifftai-crm.local>"),
  // z.coerce.boolean() would treat the literal string "false" as truthy (Boolean("false")
  // is true) — parse the string explicitly instead.
  SMTP_SECURE: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),

  // Reserved for the Documents/Attachments phases; the lead-ingestion pipeline is the
  // first feature to actually read these (inbound platform attachments -> MinIO).
  S3_ENDPOINT: z.string().url().default("http://localhost:9000"),
  S3_REGION: z.string().default("us-east-1"),
  S3_ACCESS_KEY: z.string().min(1).default("gifftai_minio_admin"),
  S3_SECRET_KEY: z.string().min(1).default("gifftai_minio_password"),
  S3_BUCKET: z.string().min(1).default("gifftai-crm-dev"),

  // Base64-encoded 32-byte key for AES-256-GCM encryption of OAuth/API tokens at rest
  // (lib/crypto.ts). Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
  TOKEN_ENCRYPTION_KEY: z
    .string()
    .refine((v) => {
      try {
        return Buffer.from(v, "base64").length === 32;
      } catch {
        return false;
      }
    }, "TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key"),

  // Telegram Bot API delivery mode. "webhook" (default, production-shape) requires a
  // public HTTPS URL registered via POST /api/integrations/telegram/set-webhook.
  // "polling" needs no public URL — useful for local dev behind NAT/no tunnel.
  TELEGRAM_MODE: z.enum(["webhook", "polling"]).default("webhook"),

  // Meta (Instagram Messaging) app credentials. WhatsApp no longer uses Meta's Graph API —
  // see WAHAMSTER_API_BASE_URL below — this is now Instagram-only. Left optional so the
  // server boots fine unconfigured; Instagram simply stays disconnected until supplied.
  META_APP_ID: z.string().optional(),
  META_APP_SECRET: z.string().optional(),
  // Arbitrary shared secret you choose and enter in the Meta App's webhook config
  // (the "Verify Token" field) — Meta echoes it back on the GET verification handshake.
  META_WEBHOOK_VERIFY_TOKEN: z.string().optional(),

  LINKEDIN_CLIENT_ID: z.string().optional(),
  LINKEDIN_CLIENT_SECRET: z.string().optional(),

  // WhatsApp integration backend — WaHamster (whatsapp.lotsofcode.in), not Meta's Graph
  // API. Per-connection API key/secret are entered via Settings → Integrations and stored
  // encrypted in IntegrationConnection (like Telegram's bot token), never here.
  WAHAMSTER_API_BASE_URL: z.string().url().default("https://whatsapp.lotsofcode.in/api/v1"),

  // RM Requests: gifftai_official_web's admin API base (its FastAPI admin service). In
  // prod this is that repo's admin-api container, reached by container name over the
  // small external "gifftai-shared" Docker network both compose projects join for this
  // one connection (http://admin-api:8001/api/v1/admin) — not a public URL, and not
  // reachable via host.docker.internal/the bridge gateway (Docker's 127.0.0.1-scoped
  // port publishing is loopback-only, confirmed not reachable that way); see
  // docker/docker-compose.prod.yml. Every call carries WEBSITE_ADMIN_SERVICE_KEY as
  // X-Service-Key plus the acting CRM user's email as X-Actor-Email — see
  // modules/rm-requests/websiteAdminClient.ts. Both left optional so the server boots
  // fine unconfigured; the RM Requests pages simply show "not connected" until set,
  // same convention as META_APP_ID/WAHAMSTER above.
  WEBSITE_ADMIN_API_URL: z.string().url().optional().or(z.literal("")),
  WEBSITE_ADMIN_SERVICE_KEY: z.string().optional(),

  // Public origin of the marketing site (gifftai.com). Blog / CMS (modules/blog) proxies
  // onto the same admin API as RM Requests above, but authenticates with the service key
  // alone and asserts the user's blog scope in X-CRM-Blog-Scope (CRM permissions are the
  // source of truth — no gifftai admin account needed). Blog images are stored on the
  // gifftai side and served publicly by its gateway at `/api/v1/blog/media/...`, so this
  // is only used to turn the stored relative image path into an absolute URL the CRM UI
  // can preview. The default is correct for production.
  WEBSITE_PUBLIC_URL: z.string().url().default("https://gifftai.com"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === "production";
export const isDevelopment = env.NODE_ENV === "development";
