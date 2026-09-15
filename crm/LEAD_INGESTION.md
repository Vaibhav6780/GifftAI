# Automatic Lead Ingestion

GifftAI CRM automatically captures inbound inquiries from five channels into the Leads
module, with no manual entry: **Website**, **Instagram**, **WhatsApp**, **LinkedIn**, and
**Telegram**. Every source funnels through one shared pipeline
(`apps/api/src/modules/lead-ingestion/lead-ingestion.service.ts`), so dedup, conversation
history, and attachments are handled identically regardless of where a lead came from.

## What's fully live today

| Source | Status | Requires |
|---|---|---|
| Website | ✅ Live now | Nothing — just point your contact form at the endpoint below |
| Telegram | ✅ Live once connected | A bot token from @BotFather (2 minutes, no review) |
| WhatsApp | ⚙️ Code-complete, inert until connected | A WaHamster account (whatsapp.lotsofcode.in) — API key + secret |
| Instagram | ⚙️ Code-complete, inert until connected | A Meta Developer App + Instagram professional account linked to a Facebook Page |
| LinkedIn | ⚠️ Identity + CSV import only | A LinkedIn Developer App (real-time sync isn't available — see below) |

## Architecture

```
apps/api/src/modules/
  lead-ingestion/        shared pipeline core — every adapter calls ingest() here
  integrations/
    website/             public contact-form endpoint, synchronous
    telegram/             webhook + long-poll fallback, Bot API client, admin connect
    whatsapp/              webhook, WaHamster API client (wahamster.client.ts), API key/secret connect
    instagram/             webhook, OAuth (Facebook Login for Business), Graph API client
    linkedin/               OAuth (identity only) + CSV import of Lead Gen Form exports
    meta/                  shared webhook signature verification (Instagram only — WhatsApp no longer uses Meta)
    shared/                Redis-backed OAuth CSRF state (Instagram + LinkedIn)
    admin/                 generic list/detail/disconnect/resync API
    public/                aggregates every unauthenticated route, mounted at /public
```

Every inbound message — regardless of source — is normalized to one shape
(`NormalizedInboundLead`) before it reaches the shared service. The service:

1. Deduplicates by, in order: (a) an existing `LeadExternalIdentity` for that
   `(channel, external user id)`, (b) an email or phone match against any existing Lead,
   (c) otherwise creates a new Lead.
2. Never overwrites contact fields a human already entered — only fills in currently-null
   fields.
3. Links messaging-source inquiries to a `Conversation`/`Message` thread (deduplicated by
   external message id, so webhook retries never create duplicate messages).
4. Downloads and stores any attachments in the existing MinIO/S3 bucket.
5. Writes an `Activity` timeline entry.

All of this is visible per-lead at `GET /api/leads/:id/timeline`, rendered in the Lead
detail page's "Conversation history" section.

## Environment variables

Add these to `apps/api/.env` (see `.env.example` for the full annotated list):

```
TOKEN_ENCRYPTION_KEY=<base64, 32 bytes — node -e "console.log(require('crypto').randomBytes(32).toString('base64'))">
TELEGRAM_MODE=webhook            # or "polling" for local dev with no public URL
META_APP_ID=
META_APP_SECRET=
META_WEBHOOK_VERIFY_TOKEN=       # any string you also enter in Meta's webhook config
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
```

OAuth/API tokens are encrypted at rest (`apps/api/src/lib/crypto.ts`, AES-256-GCM) and
never returned by any admin endpoint — the Integrations page only ever shows connection
status, not the token itself.

## Per-platform setup

### Website — live now, no setup

Point your contact form at:

```
POST https://<your-api-domain>/api/public/website/contact
Content-Type: application/json

{ "name": "Jane Visitor", "email": "jane@example.com", "phone": "+1...", "company": "...", "message": "..." }
```

At least one of `email`/`phone` is required (that's what dedup keys on). Rate-limited
(20 requests/minute) since it's unauthenticated.

### Telegram — live once connected

1. Message [@BotFather](https://t.me/BotFather), run `/newbot`, copy the token it gives you.
2. In the CRM: **Settings → Integrations → Telegram → Connect**, paste the token.
3. That's it in webhook mode — the CRM registers the webhook automatically. In polling
   mode (`TELEGRAM_MODE=polling`), the worker process starts long-polling immediately.
4. Message the bot from any Telegram account — a Lead appears within seconds.

**Local dev without a public URL:** set `TELEGRAM_MODE=polling` in `apps/api/.env` and
restart the worker (`pnpm dev`). No tunnel needed.

**Local dev testing webhook mode:** run a tunnel (e.g. `ngrok http 4000`), set
`API_URL=https://<your-ngrok-subdomain>.ngrok-free.app` in `apps/api/.env`, connect the
bot, then message it — Telegram calls your tunnel, which forwards to localhost:4000.

### WhatsApp — code-complete, needs a WaHamster account

WhatsApp is backed by **WaHamster** (`whatsapp.lotsofcode.in`), a hosted WhatsApp API,
not Meta's Graph API — no Meta App, no System User token, no webhook verify-token
handshake. Authentication is a static **API Key + API Secret** pair, sent as
`X-API-Key`/`X-API-Secret` headers on every request.

1. In your WaHamster account, note the **API Key** and **API Secret** for the WhatsApp
   channel/number you want to connect.
2. In the CRM: **Settings → Integrations → WhatsApp → Connect**, enter the API Key and
   API Secret. Use **Test Connection** first to confirm they're valid (calls
   `GET /account`) without saving anything.
3. Clicking **Connect** verifies the credentials, saves them (encrypted at rest, same as
   every other integration), then checks WaHamster for a webhook already pointed at this
   app (`GET /webhooks`) and creates one if none exists (`POST /webhooks`, subscribed to
   `message.received` and `message.status`) at
   `<API_URL>/public/webhooks/whatsapp` — `API_URL` must already be a real, publicly
   reachable HTTPS URL for this step to succeed (same requirement Telegram's webhook mode
   has); if it isn't yet, the connection still saves, but no inbound messages will arrive
   until you reconnect (or extend `whatsappAdminService` with a manual
   re-register-webhook action, mirroring Telegram's `setWebhookNow`) once it is.
4. Message the connected WhatsApp number from any other number — a Lead appears, and the
   message lands in that Lead's timeline.

**Other actions available once connected:**
- **Sync Contacts** (on the integration card): pulls every WaHamster contact
  (`GET /contacts`, paginated) and creates/updates a Lead per contact, deduplicated by
  phone number — useful for backfilling contacts that existed in WaHamster before this
  CRM was connected. This also now runs **automatically every hour** in the background
  (`whatsapp-contacts-sync` BullMQ repeatable job, `apps/api/src/jobs/queues/whatsappContactsSync.queue.ts`,
  scheduled from `worker.ts` the same way `integration-token-refresh` is) as a safety net
  alongside the real-time webhook — it silently no-ops whenever WhatsApp isn't connected,
  so no manual click is required to keep contacts in sync.
- **Sync WhatsApp history** (on a Lead's detail page, when that lead has a phone number):
  pulls that number's message history (`GET /messages/{phone}`) into the Lead's timeline.
- **Send a WhatsApp message** (same Lead detail page): replies via `POST /messages/reply`
  and appends the sent message to the timeline.

**Undocumented API, built defensively:** WaHamster has no public API documentation.
`GET /account`, `GET /webhooks`, `GET /contacts`, and `GET /messages/{phone}` were all
confirmed against a real connected account during development — see the shape comments in
`apps/api/src/modules/integrations/whatsapp/wahamster.client.ts`. `POST /webhooks` and
`POST /messages/reply`'s exact request bodies, and the **inbound webhook payload shape**,
are best-effort guesses based on those confirmed shapes and common REST conventions.
`whatsapp.webhook.controller.ts` unconditionally logs every raw webhook delivery
(`logger.info(..., "WhatsApp (WaHamster) webhook received")`) specifically so the real
payload can be read off the logs the first time WaHamster actually calls it — check that
log line and correct `whatsapp.mapper.ts`'s `mapWebhookMessageReceived`/
`extractWebhookMessageStatus` (and `wahamster.client.ts`'s request bodies, if wrong) once
you have a real delivery to look at. The webhook's authenticity check is similarly
best-effort: a `secret` is sent when creating the webhook and checked against a few
plausible header names (`X-Webhook-Secret`, `X-Wahamster-Secret`,
`X-Hub-Signature-256`) on receipt, but a mismatch is only logged, not rejected, until the
real header name is confirmed.

### Instagram — code-complete, needs a Meta App + linked professional account

The Instagram Messaging API only ever exposes **direct messages sent to your connected
account's inbox**. There is no official API for comments, public post engagement, or
scraping followers/profiles — building that would violate Instagram's Terms of Service,
so it isn't implemented.

1. In the same (or a new) Meta App, add the **Instagram** product with
   `instagram_manage_messages`, `instagram_basic`, `pages_show_list`, and
   `pages_manage_metadata` permissions requested.
2. Convert your Instagram account to a Professional (Business/Creator) account and link
   it to a Facebook Page, in the Instagram app's Settings → Account → Linked Accounts.
3. Set `META_APP_ID`/`META_APP_SECRET`/`META_WEBHOOK_VERIFY_TOKEN` in `apps/api/.env`
   (Instagram is the only integration left using Meta's Graph API — WhatsApp now uses
   WaHamster instead, see its own section above).
4. Set the webhook callback URL to `https://<your-api-domain>/api/public/webhooks/instagram`,
   subscribed to `messages`.
5. In the CRM: **Settings → Integrations → Instagram → Connect** — this redirects you
   through Facebook Login, then automatically finds the Facebook Page (and its linked
   Instagram account) you administer. **v1 limitation:** if you manage multiple Pages
   with linked Instagram accounts, the first one found is used; a page-picker isn't built
   yet.
6. Message the connected Instagram account from any other account — a Lead appears.

### LinkedIn — identity + CSV import (real-time sync isn't officially available)

**This is the one source where full automation isn't possible.** LinkedIn's actual lead
and messaging data — Lead Gen Forms' Lead Sync API, Conversations API — requires approval
into LinkedIn's **Marketing Partner Program**, a formal partnership most individual
companies and developers cannot self-serve into (unlike Meta or Telegram, there's no
public developer self-signup path to this data). Building an unofficial workaround (e.g.
scraping) would violate LinkedIn's Terms of Service, so it isn't implemented.

What **is** built, as the closest sanctioned alternative:

- **OAuth identity connection** ("Sign in with LinkedIn" via OpenID Connect) — lets the
  Integrations page show "Connected as ___" for attribution/audit purposes. To set up:
  create an app at [linkedin.com/developers](https://www.linkedin.com/developers/apps),
  add the **Sign In with LinkedIn using OpenID Connect** product, set the redirect URL to
  `https://<your-api-domain>/api/public/oauth/linkedin/callback`, and put the Client
  ID/Secret in `apps/api/.env`.
- **CSV import** of Lead Gen Form exports — from LinkedIn Campaign Manager, export your
  Lead Gen Form responses as CSV, then **Settings → Integrations → LinkedIn → Import
  CSV**. Rows go through the exact same dedup/ingestion pipeline as every live source.

If your organization later obtains Marketing Partner Program access, the same
`leadIngestionService.ingest()` pipeline is ready for a webhook adapter to be added —
follow the `whatsapp`/`instagram` module structure as a template.

## Known v1 scope limits

- No automatic cross-channel identity merging: a person who messages via both Telegram
  and Instagram gets two separate identity records unless their email/phone happens to
  match on both.
- No CAPTCHA/honeypot on the website form beyond rate limiting.
- No dead-letter-queue UI — failed background jobs are inspectable via BullMQ's own APIs
  (`Queue.getFailed()`), not a dashboard.
- Each platform connects to exactly one account (one WhatsApp number, one Instagram
  account, etc.) — this CRM instance is single-tenant.
- Instagram's OAuth connect picks the first Facebook Page with a linked Instagram account
  it finds; no page-picker UI for admins managing multiple Pages.
