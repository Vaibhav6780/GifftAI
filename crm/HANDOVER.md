# GifftAI CRM — Handover

Last updated: 2026-08-31. This is a snapshot for whoever picks this project up next
(including future-you).

## Blog / CMS — CRM permissions are the source of truth, no gifftai admin account needed (2026-08-31)

**Problem:** the Blog page only worked for users whose CRM login email *also* existed as an
active admin/employee on `gifftai.com` holding `blog.*` (marketing / super_admin). Everyone
else — including CRM Super Admins — got a 401/403 from the upstream `_resolve_service_actor`
check, which the Blog page showed as a generic "Something went wrong / Retry". In practice
only one person could use it.

**Fix:** blog calls now authenticate as the **CRM service** (the shared `X-Service-Key`
alone) and no longer resolve a per-user gifftai admin. Authorization stays server-side:

- **CRM** enforces `blog:read` / `blog:manage` on every route (`blog.routes.ts`,
  unchanged) and sends `X-CRM-Blog-Scope` — the intersection of the signed-in user's real
  permissions with `{blog:read, blog:manage}`, built in `blog.controller.ts`'s
  `blogActor(req)` from `req.user` only, never from a header/body. `X-Actor-Email` is now
  audit-only. The service key is never exposed to the browser.
- **gifftai** — new `require_blog_permission()` dependency (`services/admin/dependencies.py`)
  used by every route in `routes/blog.py`. When `X-Service-Key` matches: it maps
  `X-CRM-Blog-Scope` → the concrete `blog.*` permission and enforces it (read scope can't
  reach `blog.create/update/publish/delete`), and unknown/empty/malformed scopes grant
  nothing. Otherwise it falls back to the unchanged native `admin.gifftai.com` RBAC
  (`assert_admin_permission`, extracted from `require_permission`). `get_current_admin` /
  `_resolve_service_actor` and the RM two-admin flow are untouched.
- **Audit** — `audit_logs.actor_label` (new nullable column, migration `0109`) records the
  real CRM user as `crm:<email>` when there's no local admin row (`admin_id` NULL). Shown
  in the admin Audit Changes tab ("via CRM").
- **CRM web** — `BlogListPage` now surfaces the real upstream error instead of the generic
  retry card.

**Deploy:** gifftai — `alembic upgrade head` (migration `0109` `audit_log_actor_label`,
additive, no backfill) + redeploy admin-api. CRM — redeploy api + web. No new env vars, no
CRM seed change (the `blog:*` permissions already exist). No change to who *has* the CRM
permission — still Super-Admin-only until granted via the Roles UI.

> Migration numbering note: an unrelated copy-trade migration was also sitting uncommitted
> as `0109` when this shipped. This one took `0109` (committed first); that work must
> rebase to `0110`.

**Not browser-QA'd** (Claude-in-Chrome still not connected here). Local verify: `pnpm -r
typecheck` clean across shared/api/web. The gifftai side could not be run locally (no
Python interpreter on this machine) — review only; run its test suite on deploy.

## Blog / CMS management surface — proxy onto gifftai.com's admin API (2026-08-27)

> **Superseded in part by the 2026-08-31 entry above** — the "acting CRM user's email must
> resolve to a gifftai admin/employee" constraint below no longer applies.

**SHIPPED.** CRM commit `dfed98e`, deployed to `crm.gifftai.com` via `scripts/deploycrm.sh`
+ a manual `docker compose … --profile seed run --rm seed` (the deploy's auto-seed skips
when the users table is populated — `blog:read`/`blog:manage` land Super-Admin-only, 82
perms total). The gifftai_official_web side — the whole blog feature was **also never
committed there** — shipped in the same push: `gifftai_official_web` commit `83824ab0`,
full `./scripts/deploy.sh` (migrations `0107` blog_posts + `0108` newsletter_subscribers,
all frontends rebuilt). `gifftai.com/blog` is now publicly live with 2 demo posts + 1
draft, `/academy/blogs` and `/education/blog` 308-redirect to it.

Verified end-to-end on prod: `crm.gifftai.com/api/blog/status` → 401 unauth; a post created
through the admin-api service-key path lands in `blog_posts`, audit-logged under
`admin@gifftai.com`, and renders at `gifftai.com/blog/<slug>`; drafts 404; `?q=` search and
`?category=` filter + `/categories` work; newsletter POST → 202 + dedupe. Local verify was
clean `pnpm build` (shared/api/web) + `pnpm -r typecheck` + lint + 21/23 backend tests (the
2 pre-existing `/public/*`-route failures) and a full trader `next build`.

**Ask:** manage the gifftai.com blog through `crm.gifftai.com`. **Decision taken with the
user:** the CRM is a *management front-end only* — the `blog_posts` table stays in
`gifftai_official_web`'s Postgres, that repo's gateway keeps rendering `gifftai.com/blog`,
and its `admin.gifftai.com` blog page stays too (both surfaces write the same rows). This
is the exact shape of the existing **RM Requests** feature.

- **No `gifftai_official_web` changes at all.** Its admin API already accepts this: the
  blog routes (`services/admin/routes/blog.py`) are gated by `require_permission("blog.*")`
  → `get_current_admin` → `_resolve_service_actor`, which already honours the shared
  `X-Service-Key` + `X-Actor-Email` pair (`CRM_SERVICE_KEY`, live in prod for RM Requests).
  Every create/update/publish/delete is audit-logged over there under the real acting
  admin, same as if they'd used admin.gifftai.com.
- **CRM API** — new `apps/api/src/modules/blog/`:
  - `blogAdminClient.ts` — thin proxy to `${WEBSITE_ADMIN_API_URL}/blog/*` (mirrors
    `rm-requests/websiteAdminClient.ts`), incl. multipart passthrough for `/blog/upload`
    (global `FormData`/`Blob` → `fetch`, no `Content-Type` header so fetch sets the
    boundary). snake_case DTOs ↔ camelCase at the boundary.
  - `blog.service.ts` / `blog.controller.ts` / `blog.routes.ts` — `GET|POST|PUT|DELETE
    /api/blog…` gated `blog:read` (list/detail/slug-check/status) and `blog:manage`
    (create/update/publish/unpublish/delete/upload). Mounted in `app.ts` after
    `/api/rm-requests`.
  - `lib/blogImageUpload.ts` — multer single-image middleware (PNG/JPEG/WebP/GIF, 8MB,
    matches the gifftai side), same wrap-MulterError-as-AppError pattern as
    `attachmentUpload.ts`.
- **New permissions** `blog:read` / `blog:manage` (`packages/shared/src/constants/
  permissions.ts`). Seeded Super-Admin-only — **excluded from Admin's wildcard grant** in
  `prisma/seed.ts`, same convention as `rm_requests`/`audit`/`tickets`. Grant to a
  marketing-style role via the Roles UI. **Also: the acting CRM user's email must resolve
  to an active gifftai admin/employee there holding `blog.*` (marketing role /
  super_admin)** — otherwise the upstream call 401s. Same constraint RM Requests has.
- **CRM web** — new `pages/blog/BlogListPage.tsx` (list + filters + create/edit modal with
  Content / SEO / Preview tabs, image upload, live slug-availability check, publish/
  unpublish/delete), `pages/blog/markdownPreview.ts` (the lightweight preview renderer
  ported verbatim from the gifftai admin page — canonical render is still react-markdown
  on the public site), `features/blog/api.ts` (react-query hooks). Route `/blog` gated
  `blog:read`; sidebar entry "Blog" under Administration.
- **Env:** reuses `WEBSITE_ADMIN_API_URL` / `WEBSITE_ADMIN_SERVICE_KEY` (already set in
  prod for RM Requests — `http://admin-api:8001/api/v1/admin` over the `gifftai-shared`
  network). New optional `WEBSITE_PUBLIC_URL` (api) / `VITE_WEBSITE_PUBLIC_URL` (web),
  default `https://gifftai.com`, used only to turn stored image paths
  (`/api/v1/blog/media/…`, served publicly by the gifftai gateway) into absolute preview
  URLs and "open live" links. Default is correct for prod.

**Deploy (done):** `scripts/deploycrm.sh` + a manual `docker compose --env-file
apps/api/.env -f docker/docker-compose.yml -f docker/docker-compose.prod.yml --profile seed
run --rm seed` (the deploy's auto-seed skips a populated users table, same as
`rm_requests`/`audit` before it). No Prisma migration — this repo persists nothing for
blog. `gifftai_official_web` DID need a redeploy (its blog backend + both frontends were
also uncommitted — commit `83824ab0`, `./scripts/deploy.sh`, migrations `0107`+`0108`).

**Not browser-QA'd** — Claude-in-Chrome still isn't connected on this project. But the full
chain WAS exercised on prod via the API: the `_resolve_service_actor` handshake, a
create→publish→render round-trip, drafts 404, `?q=`/`?category=`, and the newsletter. The
one path not hit on prod is the multipart `/blog/upload` (no image was uploaded through the
deployed CRM UI yet — it was verified end-to-end locally against the running admin-api).

Follow-up worth doing: upload a featured image through the deployed CRM Blog UI once (the
only prod path not yet exercised) and eyeball the create/edit modal in a browser.

## Attendance: "Extend Hours" switched from employee-chosen to fixed configured time (2026-08-18)

**Not yet committed/pushed/deployed as of this writing** — implemented and verified locally
only; no commit hash to reference below until that happens.

The one-time Overtime Extension feature already existed (6:30 PM IST cutoff, one-time-use
`AttendanceSession.extendedExitTime`, server-side office-IP check against
`OFFICE_PUBLIC_IPS`, fully audited) — a fresh ask described building this from scratch as
"Extend Hours," so this session found the existing feature first rather than duplicating
it, and adjusted the one real gap between the ask and what already existed: the employee
used to pick their own extension time via a time-picker modal; the ask wanted one fixed,
admin-configured time instead.

- New `OVERTIME_EXTENSION_TIME` env var (`apps/api/src/config/env.ts`, default `20:00`,
  validated `HH:mm`) — `extendOvertime` now combines the open session's own IST day with
  this instead of a client-supplied `time`. `POST /attendance/extend-overtime` no longer
  takes a request body at all (`extendOvertimeSchema`/`ExtendOvertimeInput` removed from
  `@gifftai/shared` — nothing else referenced them). `CurrentAttendanceStatus` gained
  `overtimeExtensionTime: string` (always present, not just after use) so the frontend can
  say what time it'll extend to before the button is clicked.
- **Real gap closed**: the backend never actually checked "is it currently past 6:30 PM" —
  only the frontend button's visibility was gated by `isPastOvertimeCutoff()`. Found this
  while re-verifying the existing feature against the new ask's explicit "backend must
  enforce current time is after 6:30 PM" requirement; added the same check server-side in
  `extendOvertime` (`AppError.badRequest` if called too early). Every other rule (one open
  session, one-time-use via `extendedExitTime`, real office IP) was already
  server-enforced and untouched.
- Frontend: "Extend Overtime" relabeled "Extend Hours" throughout (button, modal title,
  toasts), matching the ask's wording (including the exact "Extension is only available
  from the office network" message); the modal's time-picker `Input` removed — now a plain
  confirm/cancel showing the fixed configured time.
- No DB migration — reused the existing `extendedExitTime` column as both the stored value
  and the one-time-use guard, unchanged from before.

**Verification**: `tsc --noEmit` + `eslint` clean across `packages/shared`/`apps/api`/
`apps/web`. Driven end-to-end against the real local API (already-running `pnpm dev` stack
from earlier in the session): login → `POST /attendance/online` (loopback IP configured as
office) → `POST /attendance/extend-overtime` → `extendedExitTime` came back as `20:00` IST
converted to UTC correctly → repeat call correctly rejected `409 CONFLICT` → `/offline`
cleanup. Confirmed the new past-cutoff check doesn't false-reject at the current real time
(IST was already past 18:30 when tested). **Not browser-QA'd** — same standing
Claude-in-Chrome-not-connected gap as every other feature this session.

## Leads: mark-as-contacted, mark-complete, Report/Note columns everywhere (2026-08-18)

Two small features on the Leads cluster, shipped as two deploy rounds today. Both are
live — see Deploy note below.

- **Contacted Today: manual "mark as contacted" tick + filter** (`f917bae`) — the page only
  ever reflected auto-tracked activity (edits, status changes, messages), with no way to
  confirm a real outreach actually happened. New `Lead.contactedAt` column (migration
  `20260818063253_add_lead_contacted_mark`) plus `PATCH /leads/:id/contacted`, gated like
  notes/follow-ups (assigned owner or admin), writes a `lead.contacted`/`lead.uncontacted`
  audit entry. Tick button per row; new Contacted/Not-contacted filter, scoped to the
  calendar day being viewed (`contactedAt` falling on `date`, not just "ever contacted").
- **Contacted Today: Note column** (`f917bae`) — the last lead-listing table missing the
  shared `LeadNoteCell` ("Show all notes" link, `a674128` from the day before). Now
  consistent with Leads list / Follow-ups Due / Assigned Leads.
- **Follow-ups Due: "Mark complete"** (`cc93d7b`) — no way to clear a follow-up without
  opening the lead's edit page. New "Complete" column: click prompts for an optional note
  (saved to the lead if non-empty), then clears `needsFollowup`/`followupDate` via the
  existing `PATCH /leads/:id`. The completed row stays visible client-side (dimmed, with an
  Undo button restoring the original `followupDate`) instead of just vanishing once the
  list query refetches with `needsFollowup:true` — new `FollowupCompleteCell.tsx`.
- **Report column everywhere** (`cc93d7b`) — the lead activity-history modal
  (`LeadActivityModal`, status/name/follow-up changes + notes merged newest-first) was
  Leads-list-only since it shipped. Same component now on Follow-ups Due, Contacted Today,
  and the Assigned Leads widget on the Users page.

**Verification**: `tsc --noEmit` clean across `packages/shared`/`apps/api`/`apps/web` after
every change, `eslint` clean on touched files. Full local stack stood up (`pnpm dev`
against the already-running dev Docker infra) and driven via the real HTTP API end-to-end
(applied the Prisma migration locally, hit the new `PATCH /leads/:id/contacted` endpoint,
confirmed login) — local admin password was reset through the app's own forgot-password
flow (caught in the local Mailhog catcher) since the seeded password wasn't on hand,
nothing bypassed. **Not browser-QA'd** — same standing gap as every prior session,
Claude-in-Chrome extension wasn't connected when attempted.

**Deploy**: both commits pushed to `origin/main` and deployed to `crm.gifftai.com` via
`scripts/deploycrm.sh` (SSH `root@187.127.160.221` → `su - gifftai -c ...`), each verified
after: clean `git pull --ff-only` fast-forward, `20260818063253_add_lead_contacted_mark`
applied on the first round / no pending migrations on the second (12/12), correct
`127.0.0.1`-only port bindings, `127.0.0.1:3014` → `200`, `127.0.0.1:4004/health` →
`{"success":true,"data":{"status":"ok"}}`.

## Integrations auto-sync, Leads Contacted-Today fix, Task bullets, Leads optional fields, Follow-ups filters (2026-08-17)

Seven small-to-medium fixes/features, mostly on Leads, shipped across three deploy rounds
today. All three rounds are live — see Deploy note below.

- **Integrations: hourly automatic sync** (`7101104`) — new `integrations-auto-sync` BullMQ
  queue/worker/processor (mirrors the existing `integrationTokenRefresh`/
  `whatsappContactsSync` pattern), runs every 60 min, calls each connected platform's
  existing `resync()` health-check (the same one the Settings "Re-sync now" button
  triggers) for every `CONNECTED` Telegram/WhatsApp/Instagram/LinkedIn row — keeps
  `status`/`lastSyncedAt` fresh without anyone visiting Settings.
- **Real bug fix: Leads "Contacted Today" falsely flagging unchanged WhatsApp contacts**
  (`7c6c7b6`) — root cause: `leadIngestionService.ingest()` unconditionally wrote a
  `lead.updated` Activity row on every call, even when nothing about the contact actually
  changed. The pre-existing hourly WhatsApp contacts backfill (`whatsappContactsSync`,
  added in an earlier session) re-runs every contact through `ingest()`, so it was
  silently re-stamping every WhatsApp lead as "contacted" each hour, flooding the
  Contacted Today page (added `91269f7`, an earlier undocumented session — see correction
  below) with leads nobody actually touched. Fixed by tracking whether
  `patchLeadNullFieldsOnly`/`upsertExternalIdentity`/`upsertMessage` each actually changed
  anything, and only writing the Activity row when something real happened (new lead,
  patched field, newly-linked identity, genuinely new message, or new attachment) — a
  routine no-op re-sync no longer touches the lead's timeline.
- **Tasks: bullet-point Description field** (`b04b73d`) — Enter now bullets the line being
  split and continues the list on the next line instead of one flowing paragraph; Enter on
  an already-empty bullet exits the list (Word/Notion-style). Shared
  `handleBulletListKeyDown` keydown handler, wired into New Task, Edit Task, and Bulk
  Assign Tasks.
- **Leads: optional edit + first-note fields** (`c8686e1`) — `updateLeadSchema` was
  blocking saves whenever First name/Last name were left blank (`.min(1)`) or Email was
  blank (`.email()` rejects `""`), even though `email` is already a nullable DB column —
  leftover validation copied from the create schema, not an intentional requirement. Blank
  email now normalizes to `null`; blank names are stored as empty strings. The first-note
  Location/Budget/Interested-in fields no longer require all three — any subset (or none)
  is allowed, blank fields omitted from the note body; only a fully empty note is still
  blocked (backend rejects that).
- **Leads: "Show all notes" on the inline Note cell** (`a674128`) — the Note column (Leads
  list, Follow-ups Due, Users → assigned leads) only ever showed the latest note. Added a
  "Show all notes (N)" link opening every note on that lead in a modal.
- **Leads: due-date + status filters on Follow-ups Due, defaulted to today** (`5f0e9ea`,
  `e3bc172`) — new optional `followupDate` query param (mirrors the existing `createdDate`
  pattern) and a `status` filter (reuses the pre-existing `status` param — no backend
  change needed for that half). The date filter's default flipped from "everything" to
  "today" — absent param means today, `all` is the explicit escape hatch to see every
  overdue/due-today/upcoming follow-up at once, matching Tasks' `createdDate` UX.
  Non-privileged users now also get the date/status filters (previously the whole filter
  bar, owner dropdown included, was hidden from them).

**Verification**: `tsc --noEmit` clean across `packages/shared`/`apps/api`/`apps/web` after
every change. Three throwaway vitest files (bullet-list keydown behavior in jsdom,
`updateLeadSchema` blank-field/email-normalization cases, `buildFirstNoteBody`'s
omit-blank-lines logic) written, run green, then deleted — not left in the repo. The
lead-ingestion Activity fix has a real permanent test
(`lead-ingestion.service.test.ts`: a no-op backfill re-sync of an already-linked contact
produces no Activity row). Full local stack also stood up and driven this session — Docker
dev infra (`postgres`/`redis`/`minio`/`mailhog`, already running via
`restart: unless-stopped`) plus `pnpm dev` (api/worker/web natively, not containerized) —
confirmed DB already migrated (11/11) and seeded (18 users), API `/health` 200, web 200,
worker log showing all queues including the new `integrations-auto-sync` registered, zero
errors across all three logs. **Not browser-QA'd** — same standing gap as every prior
session, Claude-in-Chrome extension wasn't connected when attempted mid-session.

**Deploy**: all seven commits (`7101104` through `e3bc172`) pushed to `origin/main` and
deployed to `crm.gifftai.com` in three rounds via `scripts/deploycrm.sh` (SSH
`root@187.127.160.221` → `su - gifftai -c ...`), each verified after: clean
`git pull --ff-only` fast-forward, no pending Prisma migrations (11/11 already applied, no
reseed needed — 7 users), correct `127.0.0.1`-only port bindings (`3014`→web, `4004`→api),
`127.0.0.1:3014` → `200`, `127.0.0.1:4004/health` → `{"success":true,...}`, worker log
confirming `integrations-auto-sync` registered, zero error/fatal lines in api/worker logs
after each restart.

**Correction to the 2026-08-13 entry below**: its Deploy note claims `dc2e53b` through
`d9ecc15` (the Leads cluster + sidebar-toggle move) were "committed locally, NOT pushed,
NOT deployed." That's now stale — `git log`/`git branch --contains` confirm all six are on
`origin/main`'s mainline history, and this session's first deploy found prod already
sitting on `1152c2b`, itself many commits ahead of `d9ecc15` (via `c67bee1`, `91269f7`,
`512cfbe`, `5e278f2` — none of which have their own HANDOVER entry, a documentation gap
from whatever session shipped them, not backfilled here). Everything through `1152c2b` was
already live and pushed before this session started.

## Mobile nav, Tasks/Attendance columns, website ticket intake, Leads overhaul (2026-08-13)

A long day of small-to-medium features, mostly on Tasks/Attendance/Leads, plus a
cross-repo integration. **Deploy status is uneven — read the Deploy note at the bottom
before assuming anything here is live.**

- **Mobile navigation drawer** (`cb83c79`) — the sidebar used to just disappear below the
  `sm` breakpoint with no way to reopen it, making the app unusable on a phone. Now an
  off-canvas drawer, toggled by a hamburger button in the Topbar, tap-to-dismiss backdrop,
  auto-closes on route change.
- **Tasks: Created column + created-date filter** (`7cb541d`, `d939f0c`) — `TasksListPage.tsx`
  gained a Created column, and a `createdDate` filter (defaults to today, date input + "All
  dates" escape hatch — same UX later reused on Leads, see below). The per-user task
  drill-down modal on the Users page got the same default/filter for consistency; the
  Pending/In Progress/Completed/Overdue badge counts themselves are untouched (still true
  totals, only the modal's list view defaults to today).
- **Website support-ticket intake** (`0ce9de8`, CRM side) — the website's contact form only
  ever fed the Leads pipeline; trader-submitted support tickets (a separate flow in the
  `gifftai_official_web` repo) had no path into GifftAI-CRM's Tickets module at all. Added
  `POST /api/public/website/support` (public, unauthenticated, rate-limited, creates a real
  `Ticket`). **The other half of this — `gifftai_official_web` actually calling this
  endpoint — lives in that repo's own commit `105ea3da`, deployed and verified live this
  session** (see below); mentioning it here since "are tickets from the website landing in
  CRM" is a CRM-side question people will ask.
- **Attendance: Excel export + Half Day + Overtime columns** (`8b02337`, `c1bb15c`) — new
  `GET /attendance/export` (filtered `.xlsx`, mirrors the pre-existing Leads export
  pattern, respects the same `hideSuperAdmin` filter — now enforced server-side for
  exports specifically, unlike the page's own client-side-only version). `halfDay` (after
  10:30 AM IST) and `overtimeMinutes` (minutes worked after 6:30 PM IST) computed once in
  `attendance.service.ts` via new `packages/shared/src/lib/{halfDay,overtime}.ts` helpers —
  explicit UTC+5:30 offset math, not `Date.getHours()`, since the prod API container runs
  in UTC with no TZ set. Both flow into the Attendance page table and the new export.
- **Tasks: roll overdue Pending/In Progress tasks to "Today"** (`50f7c8d`) — display-only on
  `TasksListPage.tsx`: an overdue Pending/In Progress task shows as due "Today" (with a
  warning badge) instead of its stale past date, recomputed on every render. The stored
  `dueAt` is never touched — detail page, exports, and audit history still show the real
  original due date. Independent of whatever list filter is active (createdDate, status,
  etc.) — it's a per-row render decision, not a query change.
- **Leads: a cluster of small fixes and features** (`dc2e53b`, `759fdc4`, `f62a09e`,
  `33bf968`):
  - Explicit Pencil edit-icon button in front of the Name column (was just a plain text
    link before — same destination, more discoverable).
  - **Real bug fix**: the "first note" Location/Budget/Interested-in template only ever
    existed on the lead detail page (`LeadNotes.tsx`) — the Leads list's inline Note column
    (`LeadNoteCell.tsx`) is a separate component that always showed a plain textbox, so a
    first note added from the list silently skipped the template. Extracted a shared
    `LeadFirstNoteForm` (full + compact variants) used by both now. Also fixed a real
    silent-failure UX bug while in there: the "Add note" button used to just sit disabled
    with no explanation when a required field was empty — it now validates on click and
    tells you exactly which field(s) are missing via a toast.
  - New `createdDate` filter on Leads (same today-default/"All dates" pattern as Tasks),
    flows into the Excel export too.
  - Search now also matches phone number (partial, case-insensitive), not just
    name/email/company.
  - New **Report** column between Note and Follow-up — a blue link opening a modal with the
    lead's full activity history: status changes, name edits, follow-up
    added/updated/cleared, and notes, merged and sorted newest-first. New dedicated
    `lead.status_change`/`lead.name_change`/`lead.followup_change` audit actions (alongside
    the existing generic `lead.update`) so the feed can query them directly instead of
    parsing arbitrary diffs — mirrors the pre-existing Tasks activity-log pattern. New
    `GET /leads/:id/activity`, gated by plain `leads:read` (not the Super-Admin-only global
    Audit Log).
- **Sidebar hide/unhide + Leads UI/UX pilot** (`f62a09e`, `ba02acd`, `d9ecc15`) — new
  desktop-only sidebar collapse, persisted to `localStorage`. Landed twice: first as a
  Topbar icon button, then moved onto the sidebar's own edge as a chevron handle
  (Notion/VS Code style) per explicit follow-up ask. The tricky part: the `<aside>` clips
  to `overflow-hidden` while animating its width to `0` on collapse, so a toggle button
  living *inside* it would vanish along with everything else — fixed by rendering the
  button as a **sibling** of `<aside>` with `position: fixed` (viewport-relative, not
  clipped by the animating ancestor). Separately, **Leads got a first-pass UI/UX pilot**
  (explicitly framed as "try one page, get sign-off, then expand" — not yet
  approved/expanded to other pages): a clickable per-status stat-tile row above the filter
  bar (new `GET /leads/stats`, grouped counts respecting other active filters but excluding
  `status` itself so every tile stays visible regardless of which one is selected — reuses
  the existing Badge status colors, no new palette), skeleton table rows replacing the
  full-page spinner on load (filter bar/stat tiles stay in place instead of the whole view
  blanking out), labels above every filter control, and a small initials avatar on the
  Owner cell matching the Topbar's existing avatar treatment.

**Verification**: `pnpm --filter @gifftai/shared build` and `pnpm --filter @gifftai/api|web
typecheck` clean after every change this session. The Attendance export, Leads
date-filter/phone-search/activity-feed/stats-endpoint work was additionally verified live
against the local dev API (not just typecheck) — created throwaway test leads/attendance
sessions, exercised the real endpoints end-to-end (status changes, notes, follow-up
add/clear, name changes, date-range filtering, phone search, export buffer validity),
confirmed correct behavior, cleaned up test data afterward every time. The website ticket
intake was verified with a real end-to-end POST against the **live** `crm.gifftai.com`
public endpoint (not local dev), confirming a real `Ticket` row landed, then deleted.
**Not browser-QA'd** — same standing gap as every prior session (Claude-in-Chrome not
connected); relied on typecheck, live API verification, and confirming the Vite dev server
serves each changed file as real transformed JS with no error overlay.

**Deploy — uneven, read carefully**:
- **Live on `crm.gifftai.com`**: everything through `c1bb15c` (mobile nav drawer, Tasks
  Created column + date filter, website ticket intake endpoint, Attendance export/Half
  Day/Overtime). Confirmed via SSH: prod's `/opt/gifftai-crm` is at `c1bb15c`.
- **Pushed to GitHub, not deployed**: `50f7c8d` (Tasks roll-to-Today) — `origin/main` is at
  this commit, prod is one behind it.
- **Committed locally, NOT pushed, NOT deployed**: `dc2e53b` through `d9ecc15` — the entire
  Leads cluster (edit button, first-note fix, date filter, phone search, Report/activity
  feed, UI/UX pilot) and the sidebar-toggle-relocation follow-up. Six commits sitting only
  in this local checkout. **Push these before anyone else picks this up**, or they don't
  exist as far as GitHub/prod are concerned.
- **Cross-repo**: `gifftai_official_web`'s `105ea3da` (the ticket-mirror webhook call) was
  deployed to its own prod server this session (`./scripts/deploy.sh --service gateway`)
  and `CRM_TICKET_WEBHOOK_URL` was added to that repo's prod `.env` — confirmed live via a
  real end-to-end POST through `crm.gifftai.com`. See that repo's own HANDOVER.md for
  details; not duplicated here.

**Not yet done**: the Leads UI/UX pilot is explicitly waiting on user sign-off before the
same treatment (stat tiles, skeleton loading, labeled filters, avatars) gets rolled out to
other list pages (Tasks, Attendance, Tickets, Contacts, etc.) — don't assume it's meant to
stay Leads-only, it's paused mid-rollout, not finished. No browser visual QA on any of this
session's frontend work, per the standing gap above.

## Telegram Inbox, WFH/Leave rename, Attendance Super Admin filter (2026-08-12)

Three separate pieces of work, in two rounds. **Only the first round is actually deployed**
— see the corrected Deploy note below (2026-08-13 correction: an earlier draft of this
entry incorrectly claimed both rounds were live; verified via SSH that the server was
still sitting on the first round's commit).

- **Telegram Inbox** (`94d243c`). Telegram was previously ingestion-only: a connected bot
  turns inbound messages into `Lead`/`Conversation`/`Message` rows via the shared
  `leadIngestionService`, but there was no way to view or reply from inside the CRM — that
  only existed for WhatsApp. Added the missing reply + inbox-listing layer, mirroring
  WhatsApp's admin-service/repository/route/frontend pattern:
  - `telegramService.sendMessage` (new) — POSTs to the Bot API's `sendMessage`.
  - New `telegram.repository.ts` — `recordOutboundReply`, upserting `Conversation` on
    `[channelId, externalConversationId=chatId]` and inserting an `AGENT` `Message`,
    directly modeled on `whatsappRepository.recordOutboundReply`.
  - `telegramAdminService.listInbox`/`sendReply` — inbox listing reads `Conversation`/
    `Message` rows that inbound ingestion already populates (no history-import job needed,
    unlike WhatsApp — Telegram's Bot API has no contacts/history endpoint to backfill
    from). Chat id is resolved from the lead's existing `Conversation.externalConversationId`
    rather than a new `Lead` field, since Telegram has no phone-number equivalent.
  - New `GET /integrations/telegram/inbox` and `POST /integrations/telegram/leads/:leadId/reply`
    routes, gated by the same `leads:read`/`leads:update` permissions WhatsApp uses (no new
    permission keys — this app isn't multi-tenant and has no per-channel permission
    precedent).
  - New `TelegramInboxPage.tsx` (`/telegram/inbox`, sidebar entry) — structural copy of
    `WhatsappInboxPage.tsx`, displaying `@username` (from `LeadExternalIdentity`) or the raw
    chat id in place of a phone number.
  - **Known gap surfaced post-deploy**: the inbox showed zero messages after connecting a
    real bot, traced to `IntegrationConnection`/`Channel`/`Conversation` rows having no
    inbound traffic yet (DB showed `CONNECTED` status but 0 rows in `lead_external_identities`
    for `TELEGRAM`). User confirmed it resolved itself afterward (likely a webhook
    registration/delivery timing issue on first connect) — not root-caused in this session;
    worth another look if it recurs.

- **Tickets module** (`2392a39`) — committed and pushed in a separate, earlier session (not
  authored in this one), deployed here as part of the same round. Backend + CRM page,
  granted to Super Admin and Support Agent by default. No pending migration needed at
  deploy time — the `tickets` table already existed.

- **"WFH/Leave" rename** (`d1ff705`) — display-only rename of "Attendance Requests" /
  "Attendance Approvals" to "WFH/Leave Requests" / "WFH/Leave Approvals" across the
  sidebar, page headers, and the approvals page's empty state. Deliberately did **not**
  rename the underlying routes, types (`AttendanceRequest*`), schemas, or API paths — this
  was a user-facing label change only, requested as such.

- **Attendance page: hide Super Admin entries** (`fd30887`) — new checkbox filter on
  `/attendance`, URL-persisted as `?hideSuperAdmin=1`. `AttendanceSessionSummary` carries
  no role info of its own, so this cross-references the employee filter's already-fetched
  user list (`roles` included) rather than adding a role filter to the attendance API.
  **Known limitation**: filtering happens client-side on the already-paginated result set,
  so if Super Admin entries fill most of a page, that page can show fewer rows than the
  pagination count implies. A real server-side filter would fix this if it becomes
  noticeable in practice.

**Deploy**: only the Telegram Inbox + Tickets round (`94d243c`/`2392a39`) actually shipped,
via `scripts/deploycrm.sh` (SSH as `root`, delegating to `su - gifftai -c ...` per the
script's own guard — confirmed `/opt/gifftai-crm` is correctly `gifftai:gifftai`-owned, not
root-owned, so no repeat of the recurring root-ownership breakage documented elsewhere in
this file). No pending Prisma migrations, database already seeded (7 users), all containers
recreated with correct `127.0.0.1`-only bindings (`3014`→web, `4004`→api), `crm.gifftai.com`
→ `200` verified after, no error/fatal lines in `docker logs gifftai-crm-api-1` after
startup.

**Correction (2026-08-13)**: the WFH/Leave rename + Attendance Super Admin filter round
(`d1ff705`, `fd30887`) was **never deployed**, despite an earlier draft of this file
claiming both rounds were live. Both commits are pushed to `origin/main` on GitHub, but a
2026-08-13 session SSH'd into the prod server (`root@187.127.160.221`) and confirmed via
`git log HEAD..origin/main --oneline` that `/opt/gifftai-crm` was still sitting on
`2392a39` — three commits behind. Deploy was about to be run (`gifftai` user,
`./scripts/deploycrm.sh`) but was interrupted before executing; **still pending** as of
this update. Next session (or this one, resumed): run the deploy, then update this section
for real once `crm.gifftai.com` is confirmed serving the rename + filter.

**Verification**: `pnpm --filter @gifftai/shared build` and `pnpm --filter @gifftai/api|web
typecheck` clean after the Telegram Inbox work; `pnpm --filter @gifftai/web typecheck` clean
after the rename and Attendance filter. **Not browser-QA'd** — same standing gap as prior
sessions (Claude-in-Chrome not connected this session either); relied on typecheck/build
plus live production verification (`crm.gifftai.com` → `200`, clean logs) instead of
local UI interaction.

**Not yet done**: no end-to-end test of Telegram reply-sending against a real chat in this
session (connect → receive → reply → confirm delivery in the actual Telegram client). The
schema/API changes were verified structurally (typecheck, DB inspection) but not
functionally exercised end-to-end here.

## WhatsApp Inbox page + Import WhatsApp History (2026-08-10)

Committed (`267ab5a`), pushed to `origin/main`.

Triggered by a user report: a "Sync Contacts" click failed and logged the user out.
Diagnosed the root cause first (not fixed as a standalone patch — folded into this
feature's design instead): `syncContacts` has no overall timeout on its
contacts-then-messages loop, and the CRM's own access token expires after 15 minutes
(`JWT_ACCESS_EXPIRES_IN`) — a long-held synchronous request plausibly outran it, and the
subsequent failed silent refresh is what actually logged the user out (not a WhatsApp
401 leaking into the CRM's own auth, which the code doesn't do anywhere).

- **"Import WhatsApp History"** (Settings → Integrations, next to the existing "Sync
  Contacts" button): pulls every WaHamster contact (`GET /contacts`, creates/updates
  leads exactly like Sync Contacts already does), then for each one pages through its
  full message history (`GET /messages/{phone}`, newly given an offset loop — previously
  only used a single page) and imports **both directions** with id/status preserved via
  a new `whatsappRepository.upsertHistoricalMessage` (existing `mapWahamsterMessageToLead`
  only ever handled inbound). Dedup is enforced by the existing `Message`
  `[conversationId, externalId]` unique constraint, so re-running after a partial failure
  is always safe. **Runs as a background job** (new `whatsapp-history-import` BullMQ
  queue/processor/worker, mirrored off the existing `whatsapp-inbound` one) rather than
  inline in the HTTP request — specifically so this heavier operation can't repeat the
  Sync Contacts logout failure mode. `POST /integrations/whatsapp/import-history` only
  enqueues and returns immediately; progress (`RUNNING`/`COMPLETED`/`FAILED`, counts) is
  persisted into `IntegrationConnection.config.historyImport` and polled via
  `GET .../import-history/status` (2s interval while running, from the frontend).
- **New WhatsApp Inbox page** (`/whatsapp/inbox`, sidebar entry, gated `leads:read`):
  two-pane conversation list + chat-style thread view. New `GET
  /integrations/whatsapp/inbox` endpoint lists every WhatsApp `Conversation` linked to a
  lead (last message preview, timestamp, unread count); the thread panel deliberately
  reuses the existing `GET /leads/:id/timeline` endpoint (filtered client-side to
  `kind: "message"`) instead of a new one — only change there was adding
  `senderType`/`deliveryStatus`/`externalId` to each message entry's `metadata` so the
  thread can render direction and delivery ticks. Replying reuses the existing `POST
  .../leads/:leadId/reply` endpoint and `useSendWhatsappReply` hook unchanged.
- No new Prisma models or migrations — everything reuses `Lead`/`Channel`/
  `Conversation`/`Message`/`IntegrationConnection`. The `message.received`/
  `message.status` webhook pipeline is untouched.

**Verification**: `pnpm -r typecheck` and `pnpm -r lint` clean across all three packages
(only the same pre-existing unrelated `eslint.config.cjs`/`PlatformIcons.tsx`/
`Toast.tsx`/`apiClient.ts`/`seed.ts`/`error.middleware.ts` warnings, none in touched
files). Live-verified against the local dev stack (not just code review): no real
WaHamster credentials exist in local dev (same standing limitation as every prior
WhatsApp session here — connect/webhook registration only ever gets tested against the
live `crm.gifftai.com` domain), so `upsertHistoricalMessage` and
`touchConversationLastMessageAt` were exercised directly against real Postgres with a
synthetic inbound+outbound message pair: direction/status mapped correctly, re-inserting
the same external message id created **zero duplicates**, and the last-message-at
watermark correctly advanced but never moved backwards. `GET
/integrations/whatsapp/inbox` and `GET /leads/:id/timeline` then correctly surfaced that
seeded conversation (right lead name/phone/last-message/unread-count, right
senderType/deliveryStatus/externalId in metadata) — all test rows cleaned up afterward,
confirmed empty again. Route-level checks: unauthenticated → `401` on the new endpoints;
`POST /import-history` with WhatsApp disconnected → clean `400` "WhatsApp is not
connected", not a `500`. **Not browser-QA'd** — the Claude-in-Chrome extension still
isn't connected this session either (same standing gap as every prior session) — new/
changed frontend files were instead confirmed to compile and serve real transformed JS
from the running Vite dev server, no error overlay.

**Not yet done**: nobody has actually clicked "Import WhatsApp History" against the real
WaHamster account yet — like every other WhatsApp capability here, the first real test of
the full contacts→messages loop (and confirmation that `getMessages`'s pagination/`total`
field behaves as assumed for a real account with many messages) can only happen against
`crm.gifftai.com` with the live credentials. Worth doing once deployed, watching `docker
logs gifftai-crm-worker-1` for the `whatsapp-history-import` job's progress/completion.
Real browser visual QA for the new Inbox page and the Import History button/progress
readout is also still outstanding (standing gap, see below).

## Root cause of the recurring root-owned-files deploy breakage — found and fixed (2026-08-10)

Committed (`2cfb21f`), pushed to `origin/main`, and pulled onto the prod server.

The "`git pull --ff-only` fails with Permission denied" issue that's hit at least three
separate sessions now (2026-08-09, twice in the Day Report deploy just above, and
presumably earlier too) had never actually been root-caused before — every prior
occurrence was just patched with a `chown -R` and moved on. Traced it properly this time:

- **Root cause**: `scripts/deploycrm.sh` had no guard against being run as the wrong
  user. `last -F` on the server shows `root` logging in far more often than `gifftai` —
  whoever's operating the box (a session or the human) evidently sometimes runs the
  deploy script straight from a root shell instead of `su - gifftai -c ...`. Confirmed
  concretely via file mtimes: a cluster of 54 files under `/opt/gifftai-crm` all shared
  the exact same timestamp, `2026-08-07 12:57:32`, matching a `git pull` that ran during
  that day's deploy (see the "Task ownership enforcement..." / WhatsApp-WaHamster
  section's deploy, same day) — and those files were root-owned. Running as root doesn't
  fail *that* deploy (root can write anything), so nobody noticed; it only breaks the
  *next* deploy, once someone runs it correctly as `gifftai` and `git pull` can't
  overwrite root-owned files it needs to update.
- **Fix**: added a hard guard at the top of `scripts/deploycrm.sh` — checks `id -un`,
  refuses to run as anyone but `gifftai`, and prints both the correct invocation and the
  `chown -R gifftai:gifftai` repair command if ownership is already broken. This makes
  the mistake impossible to repeat silently, instead of relying on whoever's deploying to
  remember.

**Verified live**: confirmed the 54-file cluster (and the ~122 other pre-existing
root-owned files, mostly dating to the original 2026-08-04 checkout) were already fully
repaired by this session's `chown -R` — `gifftai:gifftai` ownership and content both
confirmed matching current `HEAD` with zero `git status` diff, so nothing was lost, only
ownership had ever been wrong. Then tested the new guard directly on the server: running
`./scripts/deploycrm.sh` as `root` now fails immediately with the FATAL message and never
touches git or docker (exit 1, no side effects); running it via `su - gifftai -c ...`
proceeds normally. `crm.gifftai.com` still `200` and zero root-owned files under
`/opt/gifftai-crm` afterward.

**Not done**: didn't track down *who/what* specifically ran the script as root on
2026-08-07 — `root`'s non-interactive SSH sessions (including this same kind of session)
don't get recorded in `/root/.bash_history`, and no cron/systemd unit on the box
references this repo, so it was very likely a one-off manual/interactive mistake, not an
automated job. The guard above should make that moot going forward regardless.

## Day Report (2026-08-10)

Committed (`e903fca`), pushed to `origin/main`, and **deployed to `crm.gifftai.com`**.

- **New `DailyReport` model** (migration `20260810054157_add_daily_reports`): one row per
  user per calendar day (`@@unique([userId, date])`), a single free-text `summary` field.
  Always *today* — same "no future/past picker" convention `AttendanceRequest` already
  uses — but unlike Attendance Requests there's no cutoff or one-shot lock: resubmitting
  the same day updates the existing row in place (`PUT /api/daily-reports/today`, a plain
  Prisma `upsert` on the unique key), so an employee can revise their report right up
  until the day ends.
- **Submitting/viewing your own report needs no permission at all** — same pattern as
  `GET /auth/me` and the Attendance Requests own-submission routes
  (`apps/api/src/modules/dailyReports/`). Viewing *everyone's* reports
  (`GET /api/daily-reports`, filterable by employee/date range, paginated) is gated by a
  new `daily_reports:read` permission, deliberately excluded from Admin's wildcard grant
  in `apps/api/prisma/seed.ts` (alongside `audit:read`/`attendance_requests:approve`/
  `users:delete_permanent`) — **Super Admin only**, per the explicit ask.
- **Reachable only from the Tasks page, deliberately no sidebar entry** — two new buttons
  on `TasksListPage.tsx` next to the existing "Team Status"/"Bulk Assign Tasks" buttons:
  "Day Report" (everyone, `/tasks/day-report` — submit/update today's report + your own
  history) and "Team Day Reports" (Super Admin only, gated by
  `useHasPermission("daily_reports:read")`, `/tasks/day-report/team` — employee/date-range
  filtered table of everyone's reports). Routed in `router.tsx` nested under the existing
  `tasks:read` block, same double-nesting pattern `/tasks/team` already uses for its extra
  `users:read` requirement.

**Verification**: `pnpm -r typecheck` and full `pnpm build` clean across all three
packages. Live-verified against the local dev API (not just code review) with throwaway
Sales Rep / plain-Admin / Super Admin test accounts: submitting a report twice in one day
correctly updates the same row (`id`/`createdAt` unchanged, `updatedAt` bumped, exactly
one row in `GET /me` afterward) rather than duplicating; `GET /daily-reports` → `403` for
both the non-admin Sales Rep and a plain Admin (confirming the seed exclusion actually
took), `200` for Super Admin showing the rep's report; empty `summary` → clean `400`.
Frontend files not force-compiled through a running Vite dev server this session (it
wasn't up) — relied on the full `pnpm build`'s clean Vite production build instead, which
covers the same ground. **Not browser-QA'd** — same standing gap as every prior session.
All test users/reports cleaned up afterward.

**Deploy hit the same recurring root-vs-`gifftai` ownership issue as the 2026-08-09
deploy**: `git pull --ff-only` failed partway through with "Permission denied" on three
files, because 176 files under `/opt/gifftai-crm` (not just `.git` this time — actual
source files) were owned by `root`, not `gifftai`. Fixed the same way,
`chown -R gifftai:gifftai /opt/gifftai-crm`, but the interrupted pull had already
partially written the incoming commit's content into the working tree with the wrong
owner, which then made a second `git pull --ff-only` refuse to run ("local changes"/
"untracked files would be overwritten"). Confirmed byte-for-byte via `git diff
FETCH_HEAD` / `git show FETCH_HEAD:<path> | diff -` that every one of those files already
exactly matched the incoming commit (i.e. this was purely a stuck partial checkout, not
divergent server-only edits) before reconciling and re-running — worth remembering
`git status`/diff-against-FETCH_HEAD is the safe way to confirm that before touching
anything on a prod checkout that refuses to fast-forward. **Root cause found and fixed
later this same session** — see the dedicated section below.

After that: `git pull --ff-only` fast-forwarded `ef5c6d4..e903fca` cleanly, one new
migration (`20260810054157_add_daily_reports`) applied, seed auto-skipped (12 existing
users) as expected so `daily_reports:read` was synced with a manual `docker compose
--profile seed up seed` afterward — confirmed via direct Postgres query
(`role_permissions` joined to `roles`/`permissions`) that it landed on **Super Admin
only**. `api`/`worker`/`web` rebuilt and recreated with correct `127.0.0.1`-only
bindings. `crm.gifftai.com` → `200`; `GET /api/daily-reports`, `GET
/api/daily-reports/me`, and `PUT /api/daily-reports/today` all correctly `401` — not
`404`/`500` — through the public domain, confirming the new routes actually landed. No
error/fatal-level entries in `docker logs gifftai-crm-api-1` after the deploy, and real
user heartbeat traffic was already flowing through successfully post-deploy.

**Not yet done**: no visual/browser pass over either new page yet.

## Real API error messages, Leads Follow-ups Due page, Audit Log page (2026-08-09)

Three commits (`5338763`, `a86bd1e`, `ef5c6d4`), pushed to `origin/main`, and **deployed to
`crm.gifftai.com`** together in one deploy.

- **Fixed every error toast in the CRM showing a generic status-code message instead of
  the real reason** (e.g. login failures showed "Request failed with status code 401"
  instead of "Invalid email or password"). Root cause: `apps/web/src/lib/unwrap.ts` only
  extracted the backend's real `error.message` when axios *resolved* with `success: false`
  in the body — but axios actually *rejects* the promise for any non-2xx response, so that
  branch was never reached; every failed request threw the raw `AxiosError`, whose
  `.message` is a generic "Request failed with status code N" string that happens to pass
  `instanceof Error`, so every `toast.error(error instanceof Error ? error.message : ...)`
  call site (all ~50 of them, every one funnels through `unwrap()`) displayed it verbatim.
  Fixed `unwrap()` to catch the rejected `AxiosError` and pull `error.response.data.error.message`
  out of the response body; same bug existed in `apiClient.ts`'s token-refresh path
  (`refreshSession`), now surfaces "Your session has expired. Please sign in again." instead
  of a raw status code on a failed silent refresh.
- **Leads → Follow-ups Due page** (`/leads/followups`, new `LeadFollowupsDuePage.tsx`):
  new `followupDue` filter on `GET /leads` (`needsFollowup: true` and `followupDate <=
  now`, new sortable-by-`followupDate` option), surfaced as a dedicated page sorted
  soonest/most-overdue first with a days-overdue readout and the same inline Note box as
  the main Leads list. Sidebar link scopes to the current user's own leads by default,
  same "self by default, editable for privileged" convention as the Tasks nav item —
  a follow-up is only actionable by its lead's owner or an admin (`assertOwnerOrPrivileged`,
  built 2026-08-07), so a regular employee's worklist starts scoped to their own.
- **Audit Log page** (`/audit`, Super Admin only): this was already-written, uncommitted
  code sitting in the working tree at the start of this session (backend module + frontend
  page, not authored this session) — reviewed, typechecked, live-verified, and committed as-is
  once confirmed complete. `GET /audit` (filterable by user/entity type/action text/date
  range, paginated) and `GET /audit/entity-types`, gated by the `audit:read` permission that
  was already seeded Super-Admin-only (excluded from Admin's wildcard grant alongside
  `settings:manage`/`attendance_requests:approve`/`users:delete_permanent`). Row click opens
  a modal with the full old/new value diff off the existing `AuditLog` table every
  create/update/delete/login action already writes to.

**Real production issue found and diagnosed while investigating a "can't add lead notes"
report (not fixed — needs an operational decision, not a code change)**: a non-admin
employee reported being unable to add notes to leads. Live DB inspection on prod found the
notes gate (`ownerId === actor.id` or Admin/Super Admin, built 2026-08-07, confirmed
correct by an earlier session's audit) is working as designed — but **547 of 548 leads in
prod have no owner set at all** (`Lead.ownerId IS NULL`), so almost nobody outside Super
Admin can add a note to almost any lead. The Owner-assign dropdown already exists on the
main Leads list (`LeadsListPage.tsx`) and bulk-assign already exists too — leads simply
aren't being assigned an owner in practice. Whoever picks this up next should either (a)
get leads actually assigned via the existing UI, or (b) if "assigned" is meant to mean
something looser than `ownerId` in practice, revisit whether the notes/follow-up ownership
gate should allow any `leads:update` holder to act on unowned leads specifically (currently
unowned leads are a dead end for everyone but Super Admin) — deliberately not decided or
built this session, flagged for the user to choose.

**Verification**: `pnpm -r typecheck` and full `pnpm build` clean across all three packages
after each change. Live-verified against the local dev API for both the error-message fix
(confirmed `POST /auth/login` with a wrong password returns `{"message":"Invalid email or
password",...}` and traced it through `unwrap()` by hand) and the Follow-ups Due filter
(created leads with an overdue/due-today/future follow-up date, confirmed `GET
/leads?followupDue=true&sortBy=followupDate&sortOrder=asc` returns only the first two,
soonest-first) and the Audit Log page (Super Admin sees real rows including this session's
own test-lead creates/deletes; a throwaway Sales Rep test user got a clean `403`;
unauthenticated got `401`). All test users/leads cleaned up afterward. **Not browser-QA'd**
— same standing gap as every prior session.

**Deploy verified**: hit a real, pre-existing prod issue unrelated to this session's code —
several files under `/opt/gifftai-crm/.git` (objects and refs) were owned by `root` instead
of the `gifftai` deploy user, which made `scripts/deploycrm.sh`'s `git pull --ff-only` fail
with "insufficient permission for adding an object to repository database" when run as
`gifftai`. Fixed with `chown -R gifftai:gifftai /opt/gifftai-crm/.git` (ownership only, no
content touched) — worth remembering if a future deploy hits the same error, likely caused
by some earlier command having been run as `root` inside that checkout. After that,
`git pull --ff-only` fast-forwarded `19313c1..ef5c6d4` cleanly; no pending migrations (pure
application code, no schema change this session); seed auto-skipped (12 existing users) as
expected, since `audit:read` was already seeded Super-Admin-only in an earlier session
before this feature existed to use it. `api`/`worker`/`web` rebuilt and recreated with
correct `127.0.0.1`-only bindings. `crm.gifftai.com` → `200`; `GET /api/audit` and `GET
/api/leads?followupDue=true` through the public domain both correctly `401` (confirms the
new routes actually landed, not a stale cache). No error/fatal-level entries in `docker logs
gifftai-crm-api-1` in the minutes after the deploy.

## Team Task Status page, Attendance Approvals history, Phone/Date columns (2026-08-08)

Committed (`e0db4d1`), pushed to `origin/main`, and **deployed to `crm.gifftai.com`**.

Two Super Admin panel requests plus two small display-only additions, all frontend-only
(the Phone/Date data already existed server-side) except the one-line `phone` fix below —
no schema migrations.

- **Team Task Status** (`/tasks/team`, new `TasksTeamStatusPage.tsx`, linked via a "Team
  Status" button on `TasksListPage.tsx`): the full employee list — Name, Phone, Department,
  Roles, account Status, clickable Pending/In Progress/Completed/Overdue task badges,
  Last login — same shape as the Users page, surfaced inside Tasks so an Admin doesn't have
  to leave that section to see everyone's load. Route requires **both** `tasks:read` and
  `users:read` (nested `RequirePermission`s — that component itself is an OR across its own
  list, so AND requires nesting). The task-summary badge row + its click-to-open-modal
  behavior was pulled out of `UsersListPage.tsx` into a shared
  `features/users/components/UserTaskSummaryCell.tsx` so the two pages can't drift, matching
  the "pulled into a shared cell" pattern from the 2026-08-07 Note-column work.
- **Attendance Approvals history**: the page already technically supported viewing
  Approved/Rejected requests via its status filter, but it defaulted to Pending and offered
  no obvious way to get back to "everything" — a plain `<Select>` doesn't read as "there's a
  history here". Replaced it with visible **Pending / History (all) / Approved / Rejected**
  tab buttons. Caught a real bug while building this: the natural instinct — model "All" as
  `status=""` — breaks, because this page's `updateParam` helper deletes empty-string
  params from the URL, and a deleted `status` param falls back to the `PENDING` default two
  lines later, so clicking "All" would silently snap back to Pending. Fixed by using a
  distinct `"ALL"` sentinel instead of `""`, translated to `undefined` only when building the
  API query. Also added a **Reviewed At** column (`request.reviewedAt` — the data already
  existed on `AttendanceRequestSummary`, just wasn't rendered).
- **Phone column**: `UserSummary` didn't carry `phone` at all before this (only
  `UserDetail` did) — added it to the shared type and to `users.service.ts`'s `toSummary()`,
  and removed the now-redundant explicit `phone` re-assignment in `toDetail()`. Shows on
  both the Users list and the new Team Task Status list, right after Name.
- **Leads list gains Phone and Date Added columns**: `LeadSummary` already had both
  `phone` and `createdAt` — the WhatsApp (and every other source's) lead-ingestion pipeline
  already auto-fills `Lead.phone` on inbound leads (`whatsapp.mapper.ts` →
  `leadIngestionService.ingest()`), this was purely a missing-column display gap on
  `LeadsListPage.tsx`. Phone sits after Name, Date Added (the lead's `createdAt`) sits after
  Source.

**Verification**: `pnpm -r typecheck` and full `pnpm build` clean across all three
packages after every incremental change (four small rounds — Team Task Status +
Attendance history first, then Users Phone, then Leads Phone, then Leads Date Added).
Since the Claude-in-Chrome extension still isn't connected this session either, verified
each changed/new file compiles by requesting it directly from the running Vite dev server
(`GET /src/.../Foo.tsx` → real transformed JS, not a 500/error overlay) rather than trusting
typecheck alone. Live-verified the Attendance Approvals fix specifically (not just reasoned
through): seeded a `PENDING` WFH request directly via Prisma (past the 9:45 AM submit
cutoff), approved it through the real `PATCH .../review` endpoint as Super Admin, and
confirmed it correctly appears under both `status=APPROVED` and no-status-param ("All")
while correctly disappearing from `status=PENDING` — with `reviewedByName: "Super Admin"`
and a real `reviewedAt` timestamp, exactly what the new column renders. Also confirmed live
that `GET /users` now returns `phone` in the list shape. Test data cleaned up afterward.
**Not browser-QA'd** — same standing gap as every prior session.

**Deploy verified**: `git pull --ff-only` fast-forwarded `99896ac..bdf9088`; no pending
migrations (pure application code — the Phone/Date columns render existing columns, no
schema change). `api`/`worker`/`web` rebuilt and recreated with correct `127.0.0.1`-only
bindings. `crm.gifftai.com` → `200`; `GET /api/attendance-requests` through the public
domain correctly `401`s (confirms the deploy actually landed, not a stale cache). No
error/fatal-level entries in `docker logs gifftai-crm-api-1` after the deploy.

## Lead/Task notes permission audit — verified live, no fix needed (2026-08-08)

Requested as "fix Lead/Task note permissions properly" (assigned owner/assignee can add
notes, Super Admin can add notes anywhere, no one else can). The ownership-gated notes
system built 2026-08-07 (see "Task ownership enforcement + dedicated Leads Notes section"
below) already satisfied every rule as written — audited it end to end and made **no code
changes**.

**Verified live**, not just by re-reading the code: created a fresh non-admin Sales Rep
account (not just Super Admin) via the real API, assigned it one lead and one task, then
confirmed against the running local dev stack — assigned lead → `POST .../notes` `201`;
a second lead **not** owned by that user → `403`; assigned task → `POST .../comments`
`201`; a second task **not** assigned to that user → `403`; Super Admin → `201` on both
regardless of assignment. Also traced the frontend: `useIsAssignedOrPrivileged`
(`apps/web/src/hooks/usePermission.ts`) gates the "Add note" UI in all four surfaces —
`LeadNotes.tsx` (Lead detail page), `LeadNoteCell.tsx` (Leads list + Assigned Leads
table), `TaskActivityLog.tsx` (Task detail page), `TaskNoteCell.tsx` (Tasks list +
Assigned Tasks table) — and mirrors the backend rule exactly. All test users/leads/tasks
created for this verification were cleaned up afterward (leads/tasks deleted, which
cascades their notes/comments; test users deactivated).

**Not done**: real browser click-through — the Claude-in-Chrome extension still isn't
connected this session either (same standing gap as every prior session noted below);
verification was real API/DB-level with a genuine non-admin account, not a rendered-page
walkthrough.

## Lead follow-up flag (needsFollowup + date), gated to owner/admin (2026-08-08)

Committed (`292bdbb`), pushed to `origin/main`, and **deployed to `crm.gifftai.com`**.

This was in-progress, uncommitted work already present in the working tree at the start
of this session — not authored this session, just reviewed, typechecked, and committed at
the user's explicit request once confirmed clean.

- New `Lead.needsFollowup`/`Lead.followupDate` columns (migration
  `20260808063103_add_lead_followup`), settable via the existing `PATCH /leads/:id`,
  gated by the same `assertOwnerOrPrivileged` rule the Lead Notes system already uses —
  only the lead's owner or an Admin/Super Admin can set/clear it; every other field on
  that same PATCH still just needs `leads:update`. Setting `needsFollowup: true` requires
  a `followupDate`; unsetting it always clears the date server-side even if the caller
  didn't send one.
- New **Follow-up** column on the main Leads list (`LeadFollowupCell.tsx`) — checkbox +
  date picker for whoever can manage it, read-only date-or-dash for everyone else.

**Verification**: `pnpm -r typecheck` clean across all packages (shared/api/web), plus a
full `pnpm build`. Live-verified against the local dev API with a throwaway non-admin
Sales Rep account and a test lead: non-owner setting `needsFollowup` → `403`; owner setting
`needsFollowup: true` with no `followupDate` → `400`; owner setting it with a date → `200`
and the response reflects both fields; a non-owner can still read the lead's follow-up
state; Admin (non-owner) can override; unauthenticated → `401`; unrelated fields (e.g.
`status`) on the same `PATCH` remain unaffected for non-owners. Test lead/users cleaned up
afterward. **Not browser-QA'd** — the Claude-in-Chrome extension still isn't connected,
same standing gap as every prior session.

**Deploy verified**: `git pull --ff-only` fast-forwarded `cfaf554..c6e2ae0` (picking up
`a1f471f`, `292bdbb`, and the HANDOVER.md doc commit together). One new migration
(`20260808063103_add_lead_followup`) applied cleanly via the `migrate` profile before
`up -d`, seed auto-skipped (8 existing users) as expected — no new permissions to sync,
this feature reuses the existing `leads:update` permission plus the same ownership check
Lead Notes already used. `api`/`worker`/`web` rebuilt and recreated with correct
`127.0.0.1`-only bindings (confirmed via the deploy script's own port-binding check, not
just assumed). `crm.gifftai.com` → `200`; `PATCH /api/leads/:id` through the public domain
correctly `401`s (not `404`/`500`). No error/fatal-level entries in `docker logs
gifftai-crm-api-1` after the deploy, and real user heartbeat traffic (`/api/presence
/heartbeat`) was already flowing through successfully post-deploy.

## Note column on the main Leads list + editable Status on the main Tasks list (2026-08-07)

Committed (`cfaf554`), pushed to `origin/main`, and **deployed to `crm.gifftai.com`**.

Follow-up to the Assigned Leads/Tasks tables below — same underlying cells, now also on
the main list pages, not just the User Edit page.

- **`LeadsListPage.tsx`** gets a new **Note** column: shows the lead's most recent note and
  a small inline input to add another, without leaving the list.
- **`TasksListPage.tsx`**'s Status column, previously a read-only `Badge`, is now the same
  editable dropdown the User Edit page already had — the assignee (or an Admin/Super Admin)
  can change a task's status straight from the list.
- Both cells were pulled out of `AssignedLeadsTable.tsx`/`AssignedTasksTable.tsx` into
  shared components (`features/leads/components/LeadNoteCell.tsx`,
  `features/tasks/components/TaskStatusCell.tsx` + `TaskNoteCell.tsx`) since they're now
  used in two places each; the Assigned Leads/Tasks tables were updated to use the shared
  versions too rather than keeping their own copies. No backend changes — pure reuse of the
  Lead Notes / Task Comments / status-update endpoints and the `useIsAssignedOrPrivileged`
  gate already in place.

**Verification**: typecheck and full `pnpm build` clean across all three packages. Local
dev stack started and confirmed via direct API calls (login as Super Admin) that
`GET /tasks`/`GET /leads` return the `assignedToId`/`ownerId` fields these cells key their
edit-permission check on. The underlying status-update and note-add mutations were already
verified end-to-end in the Assigned Leads/Tasks tables work just above. No browser
extension available this session, so no visual/browser QA — left the local dev stack
running (`localhost:5173`) for manual sign-off before this note was written.

**Deploy verified**: `git pull --ff-only` fast-forwarded `5491a97..cfaf554`; no new
migrations (pure application code, no schema change) and no new permissions to sync.
`api`/`worker`/`web` rebuilt and recreated with correct `127.0.0.1`-only bindings.
`crm.gifftai.com` → `200`. `docker logs gifftai-crm-api-1` showed a real user's session
(on `/dashboard`) refresh its token and continue sending successful heartbeats immediately
after the deploy, with no errors.

## Permanent user deletion (Super Admin only) + inline Assigned Leads/Tasks tables (2026-08-07)

Committed (`c21342b`), pushed to `origin/main`, and **deployed to `crm.gifftai.com`**.

- **Hard-delete users** — distinct from the existing `DELETE /users/:id` (deactivate,
  fully reversible). New `DELETE /users/:id/permanent` gated by a new
  `users:delete_permanent` permission, deliberately excluded from Admin's wildcard grant in
  `apps/api/prisma/seed.ts` (same pattern as `settings:manage`/`audit:read`) so only Super
  Admin holds it. Guards in `users.service.ts::hardDelete`: blocks self-delete, blocks
  deleting the last Super Admin (`countUsersWithRole`), and blocks deletion entirely if the
  user has any content that would either hard-`Restrict` at the DB level or silently
  disappear via `Cascade` (created tasks, notes, task comments, organized events, created
  campaigns/email templates/workflows, owned folders, uploaded documents/document
  versions/attachments, authored KB articles) — `getBlockingContentSummary` returns an
  itemized count of each so the error message tells the caller exactly what to reassign or
  delete first, rather than either silently losing business content or surfacing a raw
  Postgres FK-violation `500`. New "Danger zone" card on `UserEditPage.tsx`
  (`canHardDelete && !isSelf`), red-bordered, behind a `ConfirmDialog`.
- **Assigned Leads / Assigned Tasks tables** — `UserEditPage.tsx`'s old cards (just a count
  + "View assigned leads/tasks" link) are now real inline tables
  (`AssignedLeadsTable.tsx`/`AssignedTasksTable.tsx`), each row showing the item, a Status
  dropdown, and a Note column. Status changes reuse the existing `useUpdateLead`/
  `useUpdateTask` mutations; the Note column shows the most recent Lead Note / Task Comment
  and a small inline input to add a new one (`useAddLeadNote`/`useAddTaskComment`) — no new
  backend endpoints, purely a new client-side view over the Lead Notes / Task Comments
  systems built earlier this session. Every editable control (status dropdown, note input)
  is gated per-row by `useIsAssignedOrPrivileged` — falls back to a read-only status Badge
  for viewers who aren't the assignee/owner or an Admin/Super Admin.

**Verification**: typecheck and full `pnpm build` clean across all three packages. No
browser extension available this session, so no visual/browser QA — instead verified the
underlying flows directly against the local API as Super Admin: `GET
/leads?ownerId=`/`GET /tasks?assignedToId=` return exactly the rows the tables query,
`POST` a lead note and a task comment and confirmed both endpoints return newest-first (so
`notes[0]`/`activity[0]` is correct for "show latest"), and `PATCH` status on both a lead
and a task succeeded and was reverted afterward. Local seed re-run confirmed
`users:delete_permanent` lands on Super Admin only. Hard-delete itself was fully verified
live earlier in the session (self-delete → `403`, non-Super-Admin → `403`, clean user →
`200` + confirmed `404` on refetch, user with a blocking task → itemized `400`, retry after
removing the block → `200`, audit log row confirmed via direct `psql` query).

**Not yet done**: real browser visual QA for the new tables (standing gap, see above, and
the extension unavailable this session specifically prevented it) — worth a pass before
relying on this UI for real assignment reviews.

**Deploy verified**: `git pull --ff-only` fast-forwarded `f9a7aec..c21342b`; no new
migrations (this feature only added a permission + application code, no schema change);
`api`/`worker`/`web` rebuilt and recreated with correct `127.0.0.1`-only bindings. Seed
auto-skipped (8 existing users), so `users:delete_permanent` was synced with a manual
`docker compose --profile seed up seed` afterward — confirmed via direct Postgres query
(`role_permissions` joined to `roles`/`permissions`) that it landed on **Super Admin
only**. `crm.gifftai.com` → `200`; `DELETE /api/users/x/permanent` correctly `401`s (not
`404`) through the public domain. `docker logs gifftai-crm-api-1` showed a real user's
session already on `/users` hitting authenticated heartbeats successfully post-deploy with
no errors.

## Replace Meta WhatsApp Cloud API with WaHamster (2026-08-07)

Committed (`e6637b1`, alongside Attendance Requests and Task ownership/Leads Notes below —
one combined commit, deeply overlapping files made a per-feature split impractical),
pushed to `origin/main`, and **deployed to `crm.gifftai.com`**.

WhatsApp no longer goes through Meta's Graph API at all — it's backed by **WaHamster**
(`whatsapp.lotsofcode.in`), a hosted WhatsApp API authenticated with a static API
Key/Secret pair (`X-API-Key`/`X-API-Secret` headers) instead of a Meta System User token.
Instagram is untouched and still uses Meta (`meta.webhook.ts`'s signature verification is
now Instagram-only, not shared with WhatsApp anymore).

- **Connect flow**: `whatsappConnectSchema` now takes `apiKey`/`apiSecret` (was
  `phoneNumberId`/`wabaId`/`accessToken`) — both encrypted at rest, reusing
  `IntegrationConnection.accessTokenEnc`/`refreshTokenEnc` (a pragmatic reuse of the two
  encrypted-secret columns every platform's connection row already has, rather than adding
  WhatsApp-only columns to a shared table). New standalone **Test Connection** button
  (`POST /integrations/whatsapp/test` → `GET /account`) verifies credentials without
  saving anything. On **Connect**: verifies via `GET /account`, saves the connection, then
  checks `GET /webhooks` for one already pointed at this app and creates one via
  `POST /webhooks` (subscribed to `message.received` + `message.status`) if none exists —
  at `${API_URL}/public/webhooks/whatsapp`, the same URL-building convention
  Telegram/Instagram already use.
- **Inbound pipeline unchanged, new adapter**: `whatsapp.mapper.ts` maps WaHamster's shapes
  into the same `NormalizedInboundLead` every other source produces, so dedup
  (phone/email/external-identity), timeline linking, and attachment handling all still run
  through the one shared `leadIngestionService.ingest()` — no changes needed there.
  `POST /public/webhooks/whatsapp` (`whatsapp.webhook.controller.ts`) drops Meta's GET
  verification handshake (WaHamster's webhook registration is a plain POST we make
  ourselves, not a dashboard challenge-response) and unconditionally logs every raw
  delivery, since **WaHamster has no public API documentation** — `GET /account`,
  `GET /webhooks`, `GET /contacts`, and `GET /messages/{phone}` were all confirmed live
  against a real connected account during development (shapes documented in
  `wahamster.client.ts`'s module comment), but the inbound webhook payload shape and the
  `POST /webhooks`/`POST /messages/reply` request bodies are best-effort guesses built from
  those confirmed shapes — `whatsapp.mapper.ts`'s `mapWebhookMessageReceived`/
  `extractWebhookMessageStatus` probe several plausible field names defensively rather than
  trusting one shape, and `LEAD_INGESTION.md` documents exactly what to check in the logs
  the first time a real delivery arrives.
- **New capabilities**: "Sync Contacts" (integration card, pulls `GET /contacts`
  paginated, dedups by phone through the normal ingestion pipeline), per-lead "Sync
  WhatsApp history" (`GET /messages/{phone}`) and a WhatsApp reply composer
  (`POST /messages/reply`) on `LeadConversationTimeline.tsx`, gated by `leads:update` (not
  `settings:manage_integrations` — replying is a normal sales action, not an admin one).
  New `Message.deliveryStatus` column (migration `20260807115140_add_message_delivery_status`,
  `MessageDeliveryStatus` enum SENT/DELIVERED/READ/FAILED) populated by `message.status`
  webhook events, matched to a stored message by `externalId`.

**Verification**: typecheck/lint clean, full `pnpm build` succeeds. Live end-to-end against
the real WaHamster account the credentials belong to (not just code review): `GET
/account`/`GET /webhooks`/`GET /contacts`/`GET /messages/{phone}` all called for real;
`testConnection` verified against both the real valid credentials (returns real account
info) and deliberately-wrong ones (clean `400`, not a raw `500`). Full local pipeline
verified with synthetic webhook deliveries against a manually-inserted local-only
Channel/IntegrationConnection row (deliberately **not** a real `connect()`/`POST
/webhooks` call — see below): webhook → lead created → second delivery for the same phone
correctly updates the existing lead instead of duplicating it → a message with content
correctly appends a `kind: "message"` timeline entry → a `message.status` event correctly
set `deliveryStatus: DELIVERED` on the matching message. All test leads/conversations/
messages and the manually-inserted test Channel/IntegrationConnection rows cleaned up
afterward.

**Deliberately not tested**: never called the real `connect()`/`POST /webhooks` against
the live WaHamster account before deploying, since local dev has no publicly reachable
URL — that step now only makes sense against the real `crm.gifftai.com` `API_URL`, which
is live as of this deploy. Still true post-deploy: nobody has actually clicked Connect
with the real WaHamster credentials yet, so the webhook isn't registered and the actual
inbound payload shape/signing header are still unconfirmed (see above) — do that next,
watching `docker logs gifftai-crm-api-1` for the first `message.received` delivery. Also
not done: real browser visual QA (standing gap every session).

**Deploy verified**: `git pull --ff-only` fast-forwarded `629cdba..f9a7aec`, both new
migrations (`add_message_delivery_status`, `add_attendance_requests`) applied cleanly,
`api`/`worker`/`web` rebuilt and recreated with correct `127.0.0.1`-only bindings. Seed
auto-skipped (8 existing users) as expected, so the new `attendance_requests:approve`
permission was synced with a manual `docker compose --profile seed up seed` afterward —
confirmed via direct Postgres query that it landed on **Super Admin only**, not Admin.
`crm.gifftai.com` → `200`; the new/changed routes (`whatsapp/test`, `attendance-requests`,
`attendance-requests/me`, `tasks/:id/activity`, `leads/:id/notes`) all correctly `401` —
not `404`/`500` — through the public domain. `docker logs gifftai-crm-api-1` showed a real
user's session already hitting the freshly-deployed API successfully (an authenticated
heartbeat, `200`) with no errors, confirming the deploy didn't disrupt anyone already
using the app.

## Attendance Requests (WFH / Leave submit + Super Admin approval) (2026-08-07)

Committed (`e6637b1`) and pushed to `origin/main`. **Deployed to `crm.gifftai.com`** —
see the deploy-verification note in the WhatsApp/WaHamster section above (same deploy,
all three 2026-08-07 features shipped together).

- **New `AttendanceRequest` model** (migration `20260807121847_add_attendance_requests`):
  one row per user per calendar day (`@@unique([userId, date])`), `type` (`WORK_FROM_HOME` /
  `LEAVE`), `status` (`PENDING`/`APPROVED`/`REJECTED`), reviewer/reviewedAt/reviewNote.
  Always for *today* — there's no "request a future date" flow, matching how the
  attendance/heartbeat system it feeds is always about the current day.
- **Submit/list-own need no permission at all** (`POST /attendance-requests`,
  `GET /attendance-requests/me`, `apps/api/src/modules/attendanceRequests/`) — same pattern
  as `GET /auth/me`, since every employee can act on their own request regardless of role.
  Enforced server-side: one request per day (DB unique constraint + explicit check) and a
  **9:45 AM local-time cutoff** (`isBeforeAttendanceRequestCutoff`, moved into
  `packages/shared/src/lib/attendanceRequestCutoff.ts` so the API's enforcement and the
  web app's early UX feedback can never disagree). List-all + approve/reject
  (`GET /attendance-requests`, `PATCH /attendance-requests/:id/review`) are gated by a new
  `attendance_requests:approve` permission — deliberately **excluded from Admin's
  wildcard grant** in `apps/api/prisma/seed.ts` (alongside the pre-existing
  `settings:manage`/`audit:read` exclusions), so only Super Admin holds it, matching the
  requirement that only Super Admin can approve/reject. New sidebar entries: "Attendance
  Requests" (everyone, submit form + own history, `MyAttendanceRequestsPage.tsx`) and
  "Attendance Approvals" (Super Admin only, filterable list + Approve/Reject with an
  optional reject-reason modal, `AttendanceRequestApprovalsPage.tsx`).
- **Wired into the existing Presence/Attendance system rather than building a parallel
  one** — no new session/timer model. `computeSessionStatus`
  (`apps/api/src/lib/presenceStatus.ts`) gained an `allowRemote` flag: when a user's day
  has an approved WFH request, Online no longer requires the office-IP match (device match
  + fresh heartbeat still required), so a legitimately remote employee reads Online without
  needing the office network. `attendance.service.ts` now derives a `dayMode`
  (`OFFICE`/`WFH`/`LEAVE`) per session row from that day's approved request (batched query,
  same pattern as the existing `trustedDevicesByUserIds`) and shapes the summary
  accordingly: **Office days show Entry/Exit only** (`totalUptimeSeconds` zeroed — no
  running work-hour timer, per spec), **WFH days keep the full running timer**, **approved
  Leave forces `status: "ON_LEAVE"`** with no timer regardless of any stray session
  activity that day. `presence.service.ts`'s heartbeat handler does the same WFH lookup so
  the live Online signal (not just the Attendance list's derived read) respects an approved
  WFH day. `AttendanceSessionSummary` gained `dayMode`; `AttendancePage.tsx` gained a Mode
  column and blanks the Total Uptime cell for non-WFH rows.

**Scoping decision worth knowing about**: the Attendance page (session log) only shows a
"Leave" row if the employee actually has an `AttendanceSession` that day (e.g. they logged
in despite being on leave). It does **not** synthesize a row for an approved Leave day with
zero login activity — the authoritative place to see "who's on leave today" is the new
Attendance Approvals page (filter status=APPROVED, type=LEAVE), not the session-log-shaped
Attendance page. Revisit if a future ask wants leave visibility merged into that page too;
would need a session-list + request-list merge with its own pagination story, deliberately
not built this session to avoid overengineering a fairly rare edge case.

**Verification**: typecheck/lint clean across all three packages (only the same
pre-existing `eslint.config.cjs`/`PlatformIcons.tsx`/`Toast.tsx`/`apiClient.ts` issues),
full `pnpm build` (shared → api → web) succeeds, 20/22 backend tests pass (same 2
pre-existing unrelated failures as every prior session). Live-verified against the running
local dev stack via curl (not just code review): confirmed Super Admin's `/auth/me` carries
`attendance_requests:approve`; submitting a request past 9:45 AM correctly `400`s (the
cutoff check fired for real, since it genuinely was past 9:45 local time while testing);
seeded a `PENDING` WFH request directly via Prisma to exercise the rest of the flow —
list-own, list-all, approve, and a second approve attempt on the same request correctly
`400`s ("already reviewed"); confirmed the Attendance list correctly showed `dayMode: WFH`
with a real `totalUptimeSeconds` for the approved user's sessions that day, and separately
seeded an approved Leave request to confirm `dayMode: LEAVE` / `status: ON_LEAVE` /
`totalUptimeSeconds: 0` on a session that existed despite the leave. All test rows cleaned
up afterward; dev stack (`pnpm dev`, api/worker/web) started for this verification and shut
down cleanly via the full process-tree `taskkill` (see the Windows gotcha note further down
this file) once done.

**Not done**: real browser visual QA, per the standing gap below — worth a pass over both
new pages (the submit form's cutoff/already-submitted states, the approvals table and
reject modal) and the Attendance page's new Mode column before trusting pixel-correctness.

## Task ownership enforcement + dedicated Leads Notes section (2026-08-07)

Committed (`e6637b1`) and pushed to `origin/main`. **Deployed to `crm.gifftai.com`** —
same deploy as WhatsApp/WaHamster and Attendance Requests above.

- **Tasks — status/comments now ownership-gated**: `PATCH /tasks/:id` no longer lets
  anyone with the broad `tasks:update` permission change a task's `status` — only the
  task's `assignedToId` user or an Admin/Super Admin can (checked in
  `tasksService.update`, new `assertAssignedOrPrivileged` helper built on a new
  `apps/api/src/lib/authz.ts::isPrivilegedRole` that checks `roles` against
  `ROLES.ADMIN`/`ROLES.SUPER_ADMIN` — the first place this codebase checks role *names*
  rather than granular permissions, since "the assigned user specifically" isn't
  expressible as a permission grant). Other fields on the same PATCH (title, description,
  priority, due date, reassignment) are untouched by this and still just need
  `tasks:update`, per the task description's explicit scope. New `POST
  /tasks/:id/comments` (progress notes, same ownership gate, backed by the `TaskComment`
  model that already existed in the schema but had no endpoints yet) and `GET
  /tasks/:id/activity` (merges status-change history — written as a dedicated
  `task.status_change` AuditLog action distinct from the pre-existing generic
  `task.update` log, so it's cheap to query — with comments into one chronological feed,
  no schema migration needed since both AuditLog and TaskComment tables already existed).
  Frontend: `TaskEditPage.tsx`'s Status `<Select>` is `disabled` unless
  `useIsAssignedOrPrivileged(task.assignedToId)` (new hook,
  `apps/web/src/hooks/usePermission.ts`) is true; new `TaskActivityLog.tsx` card replaces
  nothing (it's new) and shows the merged history plus an add-progress-note box gated the
  same way.
- **Leads — dedicated Notes section, ownership-gated**: previously, adding a lead note
  (`POST /leads/:id/notes`) only checked the blanket `leads:update` permission — any Sales
  Manager could note any lead, not just their own. Now gated by the same
  assigned-user-or-privileged rule (`ownerId === actor.id` or Admin/Super Admin), via a new
  `assertOwnerOrPrivileged` in `leads.service.ts`. Added `PATCH /leads/:id/notes/:noteId`
  (editing didn't exist before at all) under the same rule, and `GET /leads/:id/notes` as
  its own endpoint. Notes used to be folded into the generic `GET /leads/:id/timeline`
  feed (`kind: "note"`) alongside activities/messages/attachments — pulled back out of
  there (`leads-timeline.service.ts`, `LeadTimelineEntry["kind"]` no longer includes
  `"note"`) since a merged read-only feed can't support ownership-gated edit cleanly. New
  `LeadNotes.tsx` component (list + add + inline-edit, author name + timestamp, newest
  first) sits above the now-notes-free `LeadConversationTimeline.tsx` (renamed header
  "Notes & Activity" → "Activity") on `LeadEditPage.tsx`. New `lead:note_updated` socket
  event mirrors the existing `lead:note_created` for live cross-tab sync
  (`useRealtimeSync.ts`).
- Editing a note keeps its original `createdAt` and author attribution (only `body`
  changes) — so an Admin correcting someone else's note doesn't silently reassign
  authorship or reorder it in the chronological list.

**Verification**: typecheck clean on all 3 packages (`shared`/`api`/`web`), lint clean
(only the same pre-existing `eslint.config.cjs`/`PlatformIcons.tsx`/`Toast.tsx`/
`apiClient.ts` warnings, none in touched files), full `pnpm build` succeeds, 20/22 backend
tests pass (same 2 pre-existing unrelated failures as every prior session). Live-verified
against the running local dev stack (not just code review) with two throwaway Sales Rep
test users: confirmed 403 on both task-status-change and task-comment for a non-assigned
user, 200/201 for the assigned user, 200 for Admin overriding on an unassigned task; same
403/201/200/200 pattern for lead-note add/edit with a non-owner/owner/Admin. Confirmed the
activity feed returns merged status-change + comment entries in the right shape, and that
`GET /leads/:id/timeline` no longer returns note entries. Test users, test task, and test
lead all cleaned up afterward (had to clear two `rl:auth:*` Redis keys mid-session after
tripping the 10-per-15-min login rate limiter from repeated verification logins — a purely
local dev workaround, not a prod concern).

## Employee Task Summary, Bulk Task Assignment, Presence & Attendance — shipped and deployed (2026-08-07)

Three features this session, committed together (mixed-file diff across all three made a
clean per-feature split impractical, unlike most other sessions in this file) and deployed
to `crm.gifftai.com`:

- **Employee Task Summary** (Users page): the backend half (`usersRepository
  .taskCountsByUserIds` — 2 grouped Prisma queries covering an entire page of users, no
  N+1 — plus `TaskSummary.leadId/leadName/contactId/contactName`) was already
  done/uncommitted coming into this session. Added the frontend: a **Tasks** column on
  `UsersListPage.tsx` with four clickable status badges (Pending/In Progress/Completed/
  Overdue) showing live per-user counts; clicking one opens `UserTasksModal.tsx`, which
  lazy-fetches only that user's tasks for the clicked status via the existing
  `useTasksList` hook (title, priority, due date, Lead/Contact, status, "Open" link to the
  existing task edit page) — reuses the `overdue` query flag that already existed, no new
  API surface.
- **Bulk Assign Tasks** (Tasks module): new `TaskBulkAssignPage.tsx`
  (`/tasks/bulk-assign`, gated `tasks:create`) — pick one employee, add/remove any number
  of task rows (Title/Description/Priority/Due Date via `useFieldArray`), Save creates all
  of them in a single request. Backend: `POST /tasks/bulk-assign`
  (`tasksRepository.bulkCreate`) wraps every row in one `prisma.$transaction` — one bad
  row rolls back the whole batch, verified live (a 2-row batch with one invalid id left
  the task count completely unchanged). Originally also supported optional
  Lead/Contact/Deal/Ticket linkage per row, plus two new minimal `deals`/`tickets`
  lookup-only modules to back those pickers (neither module has any other endpoints yet —
  not started per the table below). **Removed at the user's request partway through the
  session** — fully ripped back out (schema fields, validation, the two lookup modules,
  the frontend selects) rather than left half-wired, so the shipped shape is just
  assignee + rows of Title/Description/Priority/Due Date.
- **Employee Presence & Attendance**: new `TrustedDevice` model (one bound device per
  user, established automatically on first login, checked on every later login via an
  `X-Device-Id` header the client persists in `localStorage`,
  `apps/web/src/lib/deviceId.ts`) and `AttendanceSession` model (one row per
  login-to-logout session — device/browser/OS/ip captured at login, refreshed by a 60s
  frontend heartbeat mounted once in `AppShell`, `usePresenceHeartbeat.ts`). Online/Offline
  and Office/Remote are **derived at read time, never stored** —
  `apps/api/src/lib/presenceStatus.ts` is the one function both the heartbeat response and
  the Attendance list use, so they can never disagree. Online requires **all three**:
  device match, office IP (`OFFICE_PUBLIC_IPS` env var, comma-separated, empty by default
  so nothing reads as in-office until configured), and a heartbeat within the last 10
  minutes — confirmed explicitly with the user mid-session that this stays strict on
  purpose: a trusted device on a fresh heartbeat but off the office network still reads
  **Offline/Remote**, not Online/Remote. No cron job — a session that's gone stale simply
  computes as Offline on the next read. New `GET /api/attendance` (new `attendance:read`
  permission, Admin/Super Admin only per `apps/api/prisma/seed.ts`'s
  `ROLE_PERMISSION_MAP`) backs a new Attendance page (new sidebar entry, admin section),
  filterable by employee/date, columns Login/Logout/Last Seen/Total Uptime/Device/IP/
  Office-or-Remote/Status, polling every 30s. `authService.logout` closes the open
  session; `authService.login` opens a fresh one after closing any dangling one first.

**Real bug caught and fixed during live verification** (not just a review comment — this
shipped broken, then got caught by testing): the heartbeat handler's first draft fell back
to the *previous* heartbeat's device id whenever a request arrived with no `X-Device-Id`
header (`deviceId ?? openSession.deviceId`), so an untrusted device that simply omitted the
header would silently inherit the last-known-trusted value instead of failing the match —
device-mismatch detection didn't actually detect anything. Fixed to record exactly what
each heartbeat asserts (`deviceId ?? null`, explicit `null` not `undefined`, since Prisma
treats `undefined` as "don't touch this field"). Verified live after the fix: a heartbeat
with no header now correctly flips the session to Offline even while still on the
configured office IP.

**Verification**: typecheck/lint clean across all three packages (only the same
pre-existing `eslint.config.cjs`/`PlatformIcons.tsx`/`Toast.tsx`/`apiClient.ts`
issues noted every session), 20/22 backend tests pass (the 2 failures are pre-existing,
reproduced identically with this session's changes stashed out — unrelated
`/public/website/contact` and `/public/webhooks/telegram` route tests), full `pnpm build`
(shared → api → web) succeeds, and the whole thing was walked through live via curl
against a real dev stack rather than trusted from code review: fresh device binding on
first login, a matching-device login, a mismatched/headerless login and heartbeat both
correctly reading Offline, the bulk-assign transaction rollback, and RBAC
(`attendance:read` 403s a throwaway Sales Rep test user, 200s Super Admin). All test
users/tasks created for verification were cleaned up afterward.

**Windows-only gotcha hit while migrating**: `prisma migrate dev`'s auto-`generate` step
failed with `EPERM: ...rename query_engine-windows.dll.node...` — it can't overwrite the
Prisma engine DLL while any running `pnpm dev` process still has it loaded (Windows locks
files in use, unlike Linux). Had to `taskkill` the full `pnpm dev` process tree first
(`Get-CimInstance Win32_Process -Filter "Name='node.exe'"` to find the real tree — the
PIDs `netstat` reports for :4000/:5173 are leaves, not the roots you need to kill), then
re-run `prisma generate` standalone before restarting `pnpm dev`. Worth remembering for
any future session that changes `schema.prisma` on this machine.

**Not done**: real browser visual QA — the Claude-in-Chrome extension has still never been
connected in any session on this project. Worth a pass over the new Tasks column badges +
modal, the bulk-assign form, and the Attendance page before trusting pixel-correctness.
Also: `OFFICE_PUBLIC_IPS` is only set for local dev (`127.0.0.1,::1,::ffff:127.0.0.1`,
i.e. "loopback counts as office") — production needs the real office network's public
IP(s) filled in before Attendance's Online/Offline means anything there.

## Admin password reset, UI polish, Tasks module — shipped and deployed (2026-08-06)

Four features, each committed and deployed to `crm.gifftai.com` separately the same day
(`886d353`, `feaa8e5`, `c523d63`, `766eaea`):

- **Admin-set password** (`886d353`): `PATCH /api/users/:id/password`
  (`apps/api/src/modules/users/`), gated by the existing `users:update` permission.
  Hashes via the existing `hashPassword` (bcrypt cost 12), then **unconditionally revokes
  every refresh token** for that user (`usersRepository.revokeAllRefreshTokens`, already
  existed, previously only called from `updateStatus`) so old sessions can't keep using
  the stale credential. Deliberately allowed on your own account (unlike
  `updateStatus`/`setRoles`, which both hard-block `id === actorId`) — verified by
  changing a real test user's password, confirming login with the old password fails and
  the new one works, and confirming in Postgres that `RefreshToken.revokedAt` actually
  got set. New "Password" card on `UserEditPage.tsx`; changing your own password now logs
  you out immediately with an explanatory toast instead of leaving a session that's about
  to silently break on next refresh.
- **UI/UX pass — loading/empty/error states** (`feaa8e5`): new shared
  `PageSpinner`/`EmptyState`/`ErrorState` components
  (`apps/web/src/components/ui/`) replace per-page copy-pasted spinners and bare "No X
  found." text. Fixed a real bug along the way: 6 edit pages (Lead/Contact/Company/User/
  Role/Department) guarded on `isLoading || !data`, which never distinguished "still
  loading" from "the fetch failed" — a query error left the page spinning forever. They
  now split into explicit `isLoading`/`isError` branches with a working Retry button.
  `RolesListPage`/`IntegrationsPage` had no empty-state handling at all before this;
  now they do.
- **UI polish** (`c523d63`): `Button` gets a lift-on-hover/press-on-click
  micro-interaction (no color changes, `prefers-reduced-motion`-aware); toast
  notifications now slide in/out instead of popping instantly (two-phase dismiss in
  `Toast.tsx` — mark "dismissing" → play exit animation → remove after 200ms); every
  `type="password"` `Input` gets a built-in eye/eye-off reveal toggle, added once to the
  shared component so it applies everywhere (login, reset-password, the new admin
  password card, the WhatsApp integration's access-token field) with no per-call-site
  changes.
- **Tasks module** (`766eaea`): the third of the ten schema-only CRM modules built out —
  full CRUD (`apps/api/src/modules/tasks/`), assign via a "+ New Task" form's "Assign to"
  field (no separate assign endpoint, unlike Leads — reassignment is just a normal
  update), an "Assigned Tasks" card on `UserEditPage.tsx` (mirrors the existing "Assigned
  Leads" card), and a sidebar "Tasks" entry that lands on `?assignedToId=<your own id>`
  by default so an employee opening it sees their own tasks first (filter is still fully
  editable for anyone with broader `tasks:read` visibility). `completedAt` now actually
  gets set/cleared automatically on status transitions in/out of `COMPLETED` — that
  column existed in the schema with no logic populating it before. No RBAC/seed changes
  needed — `tasks:*` was already granted per role (confirmed Support Agent specifically
  lacks `tasks:delete`, verified live: `201` on create, `403` on delete). Same commit also
  made the Leads list's Owner column an inline assign dropdown (reusing the existing
  `PATCH /leads/:id/assign`) instead of a read-only name/dash, so assigning an
  unowned lead no longer requires opening the detail page.

**Verification pattern across all four**: typecheck/lint clean each time (only the
pre-existing unrelated `eslint.config.cjs`/`PlatformIcons.tsx`/`Toast.tsx`/`apiClient.ts`
issues, never anything in changed files), every new/changed frontend file force-compiled
through the Vite dev server, and live curl/Postgres verification against real
create-test-user → act → assert → clean-up flows rather than trusting code review alone.
Each deploy confirmed via `crm.gifftai.com` → `200` plus a targeted check that the new
route is mounted and auth-gated (`401`, not `404`/`500`) before considering it shipped.

**Still not done, still true every session**: no real browser visual QA — the
Claude-in-Chrome extension has never been connected in any session so far. Everything
above is verified at the API/build level, not by looking at the rendered pages. Worth a
real pass over `/tasks`, the Password card, the new hover/toast/reveal-toggle polish, and
the inline Leads owner dropdown before assuming pixel-correctness.

## Dashboard widgets, Contacts, Companies, Lead conversion — shipped and deployed (2026-08-06)

Committed (`455a76e`), pushed, and deployed to `crm.gifftai.com` this session:

- **Dashboard** (`apps/web/src/pages/dashboard/DashboardPage.tsx`): replaces the old
  "ships in Phase 2" placeholder with real widgets — lead counts by status, leads by
  source (a ranked list with proportional bars, deliberately no charting library —
  `recharts` is installed but still unused anywhere in the app), recent leads, and
  my-assigned leads. Backed by `GET /api/dashboard/summary`
  (`apps/api/src/modules/dashboard/`), gated by the existing `leads:read` permission (no
  new permission added — the data is just a Leads aggregate). Live-updated via a new
  `lead:created` socket event that didn't exist before (only status-change/assignment/
  note events did), emitted from both `leadsService.create()` and the lead-ingestion
  pipeline's `ingest()`, wired into `useRealtimeSync.ts`.
- **Contacts** and **Companies** (`apps/api/src/modules/{contacts,companies}/`,
  `apps/web/src/pages/{contacts,companies}/`): the first two of the ten schema-only CRM
  modules actually built out — full CRUD, filtered/paginated list pages (search +
  owner/company/KYC-status for Contacts, search + industry/owner for Companies),
  following the Leads module pattern exactly (routes → controller → service →
  repository). RBAC needed no changes — `contacts:*`/`companies:*` permissions already
  existed in `packages/shared/src/constants/permissions.ts` and were already seeded onto
  the relevant roles. Deleting a Company with linked Contacts/Deals is blocked with a
  clean `400`, not a raw Prisma FK crash.
- **Real Lead → Contact conversion**: `POST /api/leads/:id/convert`
  (`leadsService.convert` + `leadsRepository.convertToContact`,
  `apps/api/src/modules/leads/`) replaces what used to be just a `CONVERTED` status label
  with no actual effect — it now creates a real Contact from the lead's fields,
  find-or-creates a Company from the lead's free-text `company` field and links it, and
  sets the (already-modeled but previously-unused) `Lead.convertedContactId`/
  `convertedAt` columns. Surfaced as a "Convert to Contact" button on `LeadEditPage.tsx`
  that becomes a "View contact →" link once converted.

**Deploy verified**: `git pull --ff-only` fast-forwarded cleanly on the prod server, all 3
images rebuilt without error, `prisma migrate deploy` had nothing pending (no schema
changes this session), containers recreated with correct `127.0.0.1`-only port bindings,
`crm.gifftai.com` → `200`, and `GET /api/dashboard/summary` correctly `401`s an
unauthenticated request (confirms the new route is actually live and auth-gated, not a
404/500). Also ran a local `docker compose build` dry-run (using a throwaway
`POSTGRES_PASSWORD` shell var, never written to any file) before pushing, to catch
Dockerfile/build-time errors before touching prod — clean.

**Not done**: real browser visual QA — the Claude-in-Chrome extension wasn't connected in
this session either (same gap noted in the Lead Ingestion session below). Verification
was typecheck/lint/curl-level API testing + the Docker build dry-run, not an actual look
at the rendered pages. Worth a pass over `/dashboard`, `/contacts`, `/companies`, and the
Lead detail page's new Convert button before trusting the UI is pixel-correct.

## Bulk lead assignment, LOST status, notes, realtime sync — shipped and deployed (2026-08-05)

Committed (`95bd045`), pushed, and deployed to `crm.gifftai.com` this session:

- **Bulk lead assignment**: checkbox multi-select on `LeadsListPage`, a bulk-owner picker
  that appears once ≥1 row is selected (gated behind `leads:assign`), backed by a new
  `PATCH /bulk-assign` endpoint (`leadsService.bulkAssign` — validates every id exists
  before assigning, writes one audit-log row per lead).
- **`LOST` lead status** added to the `LeadStatus` enum (alongside NEW/CONTACTED/
  QUALIFIED/UNQUALIFIED/CONVERTED) — Prisma migration
  `20260805102851_add_lost_lead_status`, plus the matching option in the status filter
  and the per-lead status `<Select>`.
- **Lead notes**: `leadsService.addNote` + `LeadNote` type, surfaced via
  `LeadConversationTimeline`.
- **Realtime sync**: `apps/api/src/sockets/index.ts` now exports a module-level `io`
  singleton (assigned once `createSocketServer` runs at boot; every emit call-site uses
  `io?.emit` so tests/scripts that never boot the HTTP server don't crash) so
  `leads.service.ts` can broadcast `lead:assigned` / `lead:status_changed` /
  `lead:note_created` without threading the socket server through every service
  constructor. Frontend: new `apps/web/src/hooks/useRealtimeSync.ts` subscribes and
  invalidates the relevant React Query caches so every open CRM tab updates live.
  Broadcast is global (not per-lead-room) — deliberate simplicity call for a small
  internal sales tool, see the comment in `sockets/index.ts` if scale ever demands
  room-scoping later.

**Deploy-key breakage found and fixed while deploying this**: the prod server's
`git@github-crm:...` remote depends on a `Host github-crm` alias in
`root@187.127.160.221`'s `~/.ssh/config` — that file didn't exist at all going into this
session (likely lost in some earlier server reset/rebuild, undocumented). The one SSH key
present on the box (`~/.ssh/id_ed25519`, comment `gifftai-prod-deploy`) turned out to be a
**deploy key already registered on the sibling `gifftaiDev/gifftai_official_web` repo** —
GitHub deploy keys are strictly single-repo, so that key could never authenticate against
`Vaibhav6780/GifftAI-CRM` no matter how `~/.ssh/config` was pointed. Fixed by generating a
**dedicated keypair** on the server (`ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519_crm -C
gifftai-crm-prod-deploy`, fingerprint `SHA256:0pEDAJ/UJFmj/SHIIH6D9m2WXr2o5PZbc6GAjigMmqs`),
adding its public half as a **read-only** deploy key on `Vaibhav6780/GifftAI-CRM` via the
GitHub UI, and repointing `~/.ssh/config`'s `github-crm` alias's `IdentityFile` at it.
Verified with `ssh -T github-crm` returning `Hi Vaibhav6780/GifftAI-CRM!` before trusting
the deploy. Also hit (and fixed) a one-time `detected dubious ownership` git error on that
same path — root running git inside a directory owned by a different user — resolved with
`git config --global --add safe.directory /opt/gifftai-crm`.

**If a future deploy needs a *third* repo's deploy key on this same box**: don't reuse
`id_ed25519` or `id_ed25519_crm` — GitHub will reject it with "Key is already in use."
Generate a new dedicated keypair per repo, same pattern as above.

Deploy verified post-run: Prisma migration applied cleanly, `api`/`worker`/`web`
containers recreated, `curl 127.0.0.1:4004/health` → `200`, `curl 127.0.0.1:3014/` →
`200`, no errors in `docker logs gifftai-crm-api-1` beyond a harmless CJS/ESM module-type
warning.

## Live prod deploy — DONE, crm.gifftai.com is live (2026-08-05)

Finished deploying to the shared prod server (`187.127.160.221`, SSH as `root`, app runs
as `gifftai`) this session, continuing from the partial state described in an earlier
version of this section. `https://crm.gifftai.com` now returns 200 publicly, DNS
resolving through Cloudflare's proxy alongside the other subdomains.

**What it took to get from "partial" to actually live:**
1. Resolved the two open decisions: Super Admin login stays `admin@gifftai.com`; SMTP
   sender is a dedicated `vaibhav.gifftai@gmail.com` (Gmail App Password, not the account
   password — confirmed explicitly after an initial mix-up). Filled both into
   `apps/api/.env.production`'s TODOs, copied it to the server as `apps/api/.env`
   (`chmod 600`, owned by `gifftai`).
2. `scripts/deploycrm.sh` had never actually been run before this session and had three
   real bugs, all now fixed on `main`:
   - **Missing `--env-file`**: Compose's own `${VAR:?...}` interpolation in
     `docker-compose.prod.yml` (POSTGRES_PASSWORD, S3_ACCESS_KEY, etc.) is a *different*
     mechanism from the `env_file:` directive the services use — it falls back to a
     `.env` in the invocation directory, which doesn't exist, so every required-var
     interpolation failed at `docker compose build`. Fixed by adding
     `--env-file apps/api/.env` to the script's `COMPOSE` array.
   - **Script committed without the executable bit** — every fresh clone needed a manual
     `chmod +x` before `./scripts/deploycrm.sh` would run at all. Fixed with
     `git update-index --chmod=+x`. Side-effect discovered: a manual `chmod +x` done
     directly on a deployed checkout (to work around this before the fix landed) shows up
     as a tracked mode-only diff, which then blocks the script's own `git pull
     --ff-only`. If this ever recurs, `git checkout -- scripts/deploycrm.sh` clears it
     (safe since it's a mode-only diff, not content).
   - **Self-modifying-script hazard**: the script's own `git pull` step rewrites
     `scripts/deploycrm.sh` on disk while bash is still executing that same file,
     which produced a confusing exit at a wrong point in the script (manifested as
     `docker compose build` failing on `S3_ACCESS_KEY` specifically, further into the
     file than where interpolation should have failed if `--env-file` were truly absent).
     Not fixed in the script itself — worked around by ensuring the server's checkout was
     already fast-forwarded to the latest commit first, then running with `--no-pull`.
     Worth fixing properly later (e.g. re-exec `$0` after `git pull`, or split the pull
     into a wrapper outside this file) if it recurs.
3. First real build then surfaced a genuine runtime bug (not a deploy-script issue):
   `apps/api` (and `worker`) crash-looped on boot with `ERR_MODULE_NOT_FOUND` for
   `./constants/permissions` imported from `packages/shared/dist/index.js`.
   `packages/shared/tsconfig.json` uses `moduleResolution: "Bundler"`, which lets `tsc`
   emit relative imports without a file extension — fine for Vite (`apps/web`) but
   invalid for Node's native ESM resolver, which `apps/api`'s CommonJS runtime hits via
   Node 22's synchronous `require(esm)` support when loading the ESM-only `@gifftai/shared`
   package. Fixed by adding `.js` to every relative import/export specifier in the 4
   files in `packages/shared/src` that have them (`index.ts`, `schemas/roles.schema.ts`,
   `types/auth.ts`, `types/roles.ts`) — TypeScript resolves `./foo.js` back to `./foo.ts`
   fine under `Bundler` resolution, so this only changes emitted output, not
   type-checking. **Worth double-checking**: this pattern (relative imports inside
   `packages/shared/src`) should be watched for in any future file added there — same fix
   needed if a new file imports another sibling file by relative path.
4. Cloudflare DNS: proxied A record for `crm` → `187.127.160.221` added via the
   dashboard (matching the same proxy pattern already used for `admin`/`trade`/`api`),
   confirmed resolving to Cloudflare's edge IPs.
5. Final verification: `curl` to the web container directly (`127.0.0.1:3014`, 200), the
   api directly (`127.0.0.1:4004/health`, `{"success":true,...}`), through the outer
   nginx via `--resolve` (200), and finally over the public internet once DNS propagated
   (200). All 6 CRM containers (`postgres`, `redis`, `minio`, `api`, `worker`, `web`)
   confirmed healthy/up, no restarts.

**Still not done** (unchanged from before, and still the right next steps — see
"Deploy-then-connect order" below): the WhatsApp/Instagram/LinkedIn/Telegram Connect
clicks and Meta/LinkedIn webhook/OAuth redirect setup, now safe to do against the live
`crm.gifftai.com` domain.

## Deploy-then-connect order, and full removal runbook (2026-08-04)

**2026-08-07 update:** everything below about *WhatsApp* specifically is superseded — it
no longer uses a Meta dashboard-registered webhook URL at all (see "Replace Meta WhatsApp
Cloud API with WaHamster" near the top of this file). The webhook is registered by this
app calling `POST /webhooks` at connect-time, not manually in a Meta App's dashboard, so
reasons (1) and (3) below no longer apply to WhatsApp — only to Instagram and LinkedIn,
which are unchanged.

**Connect order:** deploy `crm.gifftai.com` first, *then* do the WhatsApp/Instagram/
LinkedIn/Telegram "Connect" clicks and Meta/LinkedIn webhook-URL setup against the live
domain — not against a local/ngrok URL beforehand. Reasons this doesn't transfer if done
early: (1) Meta's WhatsApp/Instagram webhook callback and LinkedIn's OAuth redirect are
each registered as one fixed absolute URL in that platform's dashboard — a URL registered
against a local tunnel has to be manually repointed at `crm.gifftai.com` later anyway;
(2) Telegram webhook mode auto-registers using whatever `API_URL` is active at the moment
you click Connect; (3) every "Connect" click writes an encrypted-token row into
*that environment's own Postgres* — dev and prod are separate databases, so a dev-side
connection simply doesn't exist in prod, and even copying the DB over wouldn't help since
`.env.production`'s `TOKEN_ENCRYPTION_KEY` differs from dev's, so any copied token would
fail to decrypt. Creating the Meta App / WhatsApp Business Account / System User token /
LinkedIn Developer App themselves is fine to do anytime — that part is account-level
setup on Meta/LinkedIn's side, not tied to a domain.

**Full removal runbook** — kept easy on purpose: the CRM runs as its own Docker Compose
project (`name: gifftai-crm-dev` in `docker/docker-compose.yml`, overridden to
`gifftai-crm` by `docker/docker-compose.prod.yml` — Compose's `name:` field, when set in
both files, takes the override's value), with its own network and its own named volumes
(`gifftai_postgres_data`, `gifftai_redis_data`, `gifftai_minio_data`, prefixed `gifftai-crm_` on
disk). It shares **no** database, Redis, network, or volume with the main
`gifftai_official_web` stack. The only point of contact at all is the nginx vhost block
in that repo's `deploy/nginx/gifftai.conf`. To fully remove CRM from the prod server if
storage/request load ever becomes a problem:

1. `cd /opt/gifftai-crm && docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml down -v`
   — stops and removes every CRM container **and** its 3 volumes. The `-v` is what
   actually deletes the data (Postgres, Redis, MinIO/S3 objects) — irreversible, so only
   include it once you're sure you don't want the data back; drop it to keep the volumes
   on disk while just stopping the containers.
2. In `gifftai_official_web/deploy/nginx/gifftai.conf`: delete the whole "2b) CRM —
   crm.gifftai.com" server block, the `crm_frontend` upstream at the top, and the
   `crm.gifftai.com` entry from the `:80 → :443` redirect's `server_name` list. Then
   `nginx -t` and reload on the prod server.
3. Remove the Cloudflare DNS record for `crm.gifftai.com`.
4. Optional: `rm -rf /opt/gifftai-crm` on the server to reclaim the remaining disk (repo
   checkout, node_modules, build output — the actual data was already gone in step 1).

Nothing in the main gifftai stack (Postgres/TimescaleDB/Redis, gateway, trader/admin
frontends) needs touching at any point in this sequence — that's the reason it was built
as a fully separate Compose project instead of, say, sharing the main Postgres instance.

## crm.gifftai.com prod wiring — code prep only (2026-08-04)

`docker/docker-compose.prod.yml` `web`/`api` ports rebound off host `80`/`4000` onto
`127.0.0.1:3014`/`127.0.0.1:4004` so they don't collide with the sibling
`gifftai_official_web` repo's own nginx (which owns host `80`/`443` on the shared prod
box). Matching `crm.gifftai.com` server block added in that repo's
`deploy/nginx/gifftai.conf`, proxying to `127.0.0.1:3014` — this CRM's own nginx
container still handles the internal `/api` and `/socket.io` split, so the outer block
just forwards everything through with WS upgrade headers intact.

Also generated `apps/api/.env.production` (git-ignored — added `.env.production` to
`.gitignore` in the same pass, since the existing patterns only covered `.env` /
`.env.local` / `.env.*.local`, not this exact name) with fresh random secrets
(`POSTGRES_PASSWORD`, `JWT_ACCESS_SECRET`, `TOKEN_ENCRYPTION_KEY`, `S3_ACCESS_KEY`,
`S3_SECRET_KEY`, `SEED_SUPER_ADMIN_PASSWORD` — all unique to this file, not reused from
the dev `.env`), pointed at the docker-compose service hostnames (`postgres`, `redis`,
`minio`) instead of `localhost`, and `API_URL`/`WEB_URL`/`COOKIE_DOMAIN` set for
`crm.gifftai.com`. Two TODOs left inside it deliberately: real SMTP creds (blank —
didn't want to copy the main site's Gmail app password across repos without being
asked) and the real `SEED_SUPER_ADMIN_EMAIL` inbox (placeholder `admin@gifftai.com`).

**Still open before this can actually go live** (explicitly scoped out this session —
code changes only, nothing touched on the live server):
- Cloudflare DNS record for `crm.gifftai.com` (proxied A/CNAME to the server IP).
- Confirm the origin cert already used for `admin`/`trade`/`api` subdomains covers `crm`
  too (likely a `*.gifftai.com` wildcard, but unverified).
- Fill the two TODOs in `apps/api/.env.production` (SMTP creds, super-admin email),
  then copy it to `apps/api/.env` on the prod server — it is NOT picked up automatically.

## Deploy script: `scripts/deploycrm.sh` (2026-08-04)

Kept deliberately separate from `gifftai_official_web/scripts/deploy.sh` — different
repo, different Compose project, different server-side working directory
(`/opt/gifftai-crm`, mirroring `/opt/gifftai`), no shared state. Mirrors that script's
safety conventions (refuses to run without the prod compose overlay present, migrations
run via a profile-gated one-shot service *before* `up -d` with a blocking exit-code
check, `--no-pull`/`--no-build`/`--no-migrate`/`--service` flags, full-stack `up -d`
even when `--service` narrowed the build) but adapted to this stack:

- Added a `migrate` service to `docker/docker-compose.prod.yml` (profile-gated, reuses
  the `api` image's `runtime` target since it already ships the Prisma CLI — see the
  Dockerfile's devDependencies note) running `prisma migrate deploy`, the Prisma
  equivalent of the main repo's Alembic `migrate` service.
- One deliberate deviation from the main script: build does **not** use `--no-cache`.
  The main repo's `--no-cache` on every deploy caused a 278GB Docker build-cache
  disk-usage incident (`gifftai_official_web/HANDOVER.md`, 2026-08-04) — no reason to
  import that problem into a second stack.
- New guard not present in the main script: refuses to run if `apps/api/.env` is
  missing (with a pointer to `.env.production`/`.env.example`), since several services'
  `env_file:` would otherwise fail with an unhelpful error.
- `Makefile` added too (`make deploy`, `make deploy-no-pull`, `make ps`, `make logs`),
  matching the main repo's `Makefile` targets 1:1 but pointed at this repo's script and
  compose files.

Usage on the server: `cd /opt/gifftai-crm && ./scripts/deploycrm.sh` (or `make deploy`).

**Bug found and fixed while verifying this before pushing:** Compose *concatenates*
`ports:` lists across `-f` files rather than replacing them, so the prod overlay
originally left `postgres`/`redis`/`minio`'s dev-only host port bindings
(`5432`/`6379`/`9000`/`9001`, all with no `host_ip` — i.e. public on `0.0.0.0`) fully
intact in "prod" mode — Postgres and an unauthenticated Redis would have been reachable
from the open internet. Fixed with `ports: !reset []` overrides on all three in
`docker/docker-compose.prod.yml` (they only ever need the internal Docker network — same
"no host port binding" pattern the sibling `gifftai_official_web` repo's own
postgres/redis already use). Also found: `minio-init`'s bucket-bootstrap script had the
*dev* MinIO root credentials and dev bucket name (`gifftai-crm-dev`) hardcoded, which
would have failed to authenticate against prod MinIO (seeded from
`S3_ACCESS_KEY`/`S3_SECRET_KEY`) and created the wrong bucket even if it had — fixed with
an `entrypoint: !override` using `${S3_ACCESS_KEY}`/`${S3_SECRET_KEY}`/`${S3_BUCKET}`.
`mailhog` (dev-only fake SMTP catcher — also just an unauthenticated public mail viewer
if left exposed) is now gated behind a `dev-only` Compose profile so it never starts on
a plain `up -d`. All three fixes verified with `docker compose config` against the merged
prod overlay before pushing — see that command's output pattern if verifying again after
future changes to either compose file.

## What this project is

An enterprise CRM monorepo (`apps/api` — Node/Express/Prisma/BullMQ, `apps/web` —
React/Vite, `packages/shared` — shared Zod schemas/types/permissions), built module by
module. Stack is **Node, not FastAPI/Python** — if a task description says otherwise,
that's a template mismatch, ignore it.

## Build status by module

| Module | Status |
|---|---|
| Auth/IAM (login, refresh, forgot/reset password, RBAC) | ✅ Done |
| Users / Roles / Departments admin | ✅ Done |
| Leads (CRUD, list/detail, inline + bulk assign, source, timeline, convert-to-Contact) | ✅ Done |
| **Automatic Lead Ingestion** (Website/Instagram/WhatsApp/LinkedIn/Telegram) | ✅ Done — see below |
| Dashboard (lead status/source aggregates, recent leads, my-assigned leads) | ✅ Done |
| Contacts / Companies (CRUD, filters) | ✅ Done |
| Tasks (CRUD, assign, "my assigned tasks", bulk-assign, per-user task-summary badges) | ✅ Done |
| Employee Presence & Attendance (Trusted Device, heartbeat, Attendance list) | ✅ Done — see below |
| Attendance Requests (WFH/Leave submit, 9:45 AM cutoff, Super Admin approve) | ✅ Done — see above |
| Admin-set user password | ✅ Done |
| Deals / Tickets / Calendar / Marketing / Automation / Documents / Knowledge Base | ❌ Not started — schema modeled in `schema.prisma`, no modules/UI yet |

Module pattern to follow for anything new: `apps/api/src/modules/<name>/{<name>.routes,
.controller, .service, .repository}.ts` + Zod schemas/types in `packages/shared/src/
{schemas,types}/<name>.*` re-exported by name from `packages/shared/src/index.ts` +
`apps/web/src/features/<name>/api.ts` + `apps/web/src/pages/<name>/*Page.tsx`.

## Running it locally

```
pnpm infra:up      # postgres, redis, minio, mailhog (docker/docker-compose.yml)
pnpm db:migrate     # apply Prisma migrations
pnpm db:seed        # seed permissions/roles/lead sources/system user/super admin
pnpm dev            # api (:4000) + worker + web (:5173), via concurrently
```

Login: `admin@gifftai-crm.local` / `GifftAI2026Dev` (Super Admin, all permissions). If
that password stops working, it was set via the forgot-password flow through MailHog
(http://localhost:8025) — the seeded password is a random string only ever printed once
to the seed script's console, so reset-via-email is the only recovery path, not guessing.

**⚠️ Known gotcha:** `pnpm dev` processes pile up if not shut down cleanly (Ctrl+C) between
sessions. Multiple stacked copies previously ate all system RAM and caused OOM crashes.
Before starting a new session, check for orphaned processes:
```
netstat -ano | grep LISTENING | grep -E ":4000|:5173"
```
If you find old PIDs from a previous session, kill the whole `GifftAI-CRM`-path process
tree before starting fresh (see prior session notes) — don't touch unrelated `gifftai-*`
containers/processes on this machine, they belong to a different project.

## This session's work: Automatic Lead Ingestion

Built a unified pipeline so leads from 5 sources land in the Leads module automatically,
no manual entry. Full plan is archived at `C:\Users\LENOVO\.claude\plans\atomic-rolling-
locket.md`; full per-platform setup steps (env vars, Meta App creation, WhatsApp/Instagram/
LinkedIn credential steps, Telegram BotFather steps, ngrok/tunnel notes for local webhook
testing) are in **`LEAD_INGESTION.md`** at the repo root — read that before touching any
integration.

**Status per source:**
- **Website** — fully live, `POST /public/website/contact`, no config needed.
- **Telegram** — fully live once you connect a bot token via Settings → Integrations
  (`TELEGRAM_MODE=polling` in `apps/api/.env` for local dev with no public URL; `webhook`
  mode for production).
- **WhatsApp** — code-complete, inert until connected via Settings → Integrations. **No
  longer Meta** — backed by WaHamster (`whatsapp.lotsofcode.in`), a static API Key/Secret
  pair instead of a Meta System User token; see the "Replace Meta WhatsApp Cloud API with
  WaHamster" section above.
- **Instagram** — code-complete, inert until a Meta App + linked Instagram professional
  account exists; connects via OAuth from Settings → Integrations.
- **LinkedIn** — identity-only OAuth + CSV import of Lead Gen Form exports. LinkedIn's real
  lead/messaging APIs require Marketing Partner Program approval, which isn't self-serve —
  this is the closest officially-sanctioned alternative, documented in detail in
  `LEAD_INGESTION.md`.

**Architecture:** one shared `leadIngestionService.ingest()`
(`apps/api/src/modules/lead-ingestion/`) that every platform adapter under
`apps/api/src/modules/integrations/{website,telegram,whatsapp,instagram,linkedin,meta,
shared,admin,public}/` calls with a normalized shape. Dedup order: external identity match
→ email/phone match → new lead. OAuth tokens encrypted at rest (`lib/crypto.ts`, AES-256-
GCM) via `TOKEN_ENCRYPTION_KEY` in `.env`. New BullMQ queues: `telegram-inbound`,
`whatsapp-inbound`, `instagram-inbound`, `integration-token-refresh` (all started in
`apps/api/src/worker.ts`). New Prisma models: `IntegrationConnection`,
`LeadExternalIdentity`; `Conversation`/`Message` gained `leadId`/external-id columns.
Admin UI: Settings → Integrations page (`apps/web/src/pages/settings/`), plus a
"Conversation history" section on the Lead detail page.

**Verification done this session:** 22/22 backend tests pass, clean typecheck + lint on
both apps, clean production build, and live end-to-end smoke tests (website form → Lead
created; Telegram token validated against real Bot API; LinkedIn CSV import → Lead
created; integrations list; lead timeline) — all confirmed after a full clean dev-stack
restart. **Not done:** visual verification in a real browser — the Claude-in-Chrome
extension wasn't connected in that session. Worth a UI pass (Settings → Integrations page,
Lead detail's new "Conversation history" card, connect modals) before calling this
feature fully done.

## Env vars added this session

See `apps/api/.env.example` for the annotated list. New required var:
`TOKEN_ENCRYPTION_KEY` (already generated and present in the local `.env`, not committed —
regenerate with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
if setting up a fresh environment). New optional vars (leave blank until you have real
credentials): `TELEGRAM_MODE`, `META_APP_ID`, `META_APP_SECRET`,
`META_WEBHOOK_VERIFY_TOKEN`, `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`.

## Suggested next steps

1. Click **Settings → Integrations → WhatsApp → Connect** on the live
   `crm.gifftai.com` with the real WaHamster API Key/Secret — this both registers the
   real webhook (impossible to test from local dev, see the 2026-08-07 WhatsApp section
   above) and is the only way to actually confirm the inbound webhook payload
   shape/signing header, which are still unverified guesses. Watch
   `docker logs gifftai-crm-api-1` for the first `message.received` delivery and correct
   `whatsapp.mapper.ts` if the logged shape doesn't match what it currently assumes.
2. Fill in real `OFFICE_PUBLIC_IPS` in prod's `apps/api/.env` before relying on
   Attendance's Online/Office signal there — see the 2026-08-07 section above.
3. Visual/manual QA pass in a real browser — still outstanding across *every* session so
   far, including the newest additions (User Edit page's "Danger zone" hard-delete card,
   the Assigned Leads/Tasks tables on that same page, the Note column on the main Leads
   list, and the now-editable Status dropdown on the main Tasks list), the Tasks column
   badges/modal, bulk-assign form, Attendance page (now with its Mode column), the two
   new Attendance Requests pages (submit form, approvals table + reject modal), the new
   WhatsApp connect modal's Test Connection button, and the new WhatsApp reply/sync
   composer on the Lead detail page, plus everything from prior sessions (Password card,
   hover/toast/reveal-toggle polish, inline Leads owner dropdown). No session has ever had
   the Claude-in-Chrome extension connected — everything has been verified at the
   API/build level only.
4. If going toward production use of Instagram/LinkedIn (WhatsApp is WaHamster now, not
   Meta — see step 1): follow `LEAD_INGESTION.md`'s setup steps to create the real
   Meta/LinkedIn developer apps and drop credentials into env vars.
5. Next unbuilt CRM module, per the phase ordering baked into `schema.prisma`'s comments:
   **Deals/Sales Pipeline** (`Pipeline`/`PipelineStage`/`Deal` models already exist) —
   likely wants a kanban-style board (drag-and-drop between stages), the one UI pattern
   this CRM doesn't have an existing precedent for yet. Tickets/Calendar/Marketing/
   Automation/Documents/Knowledge Base remain after that.
6. Tasks still leaves the model's optional Deal/Ticket linkage and sub-task recurrence
   fields unexposed in the UI (Lead/Contact linkage is at least readable — see Task
   Summary above — but not settable from any form). Lead/Contact/Deal/Ticket linkage was
   briefly added to the bulk-assign form this session and deliberately removed again (see
   2026-08-07 section) — worth reconsidering once there's a concrete need, and once
   Deals/Tickets are real modules rather than requiring bespoke lookup endpoints.
