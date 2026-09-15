# 5 standalone frontend-only CRMs — status & resume context (2026-09-09)

**Why this file exists:** the account hit its Claude usage session limit (resets **4:30pm
Asia/Kolkata**) partway through building the 3rd of 5 CRMs. All background build agents
were stopped. This file has everything needed to resume without re-deriving context.

---

## The ask

Build **5 separate, complete, frontend-only CRM applications**, one per empty GitHub repo,
all with comparable core CRM functionality but each visually/experientially distinct — "5
genuinely different CRM products," not 5 themes of the same app. Different UI/UX, layout,
nav, dashboard concept, page names/terminology, tables/cards, forms, detail pages,
pipeline experience, typography, and design system per app.

**Strictly frontend-only**: no backend, no DB, no APIs, no auth backend, no dependency on
the existing CRM backend — mock/local data + frontend state only, each repo independently
runnable.

**Reference CRM** (read-only, for functional shape only — never copy its UI/styling):
`C:\Users\LENOVO\Desktop\gifftai\gifftai-project\GifftAI-CRM\apps\web\src` — a real
production CRM with `features/`+`pages/` for companies, contacts, leads (status
NEW/HOT/WARM/COLD/LOST), tasks, tickets, converted-users, etc. Leads use a
temperature-based status instead of a classic deal-stage pipeline — the 5 new apps each
translate that into their own persona-appropriate stage/funnel concept (adding a WON
stage to represent conversions, since the reference has no explicit "deals" entity).

## The 5 repos, names, and personas

| Repo (local path) | GitHub | Name | Persona |
| --- | --- | --- | --- |
| `gifftai-project/crm1` | github.com/Vaibhav6780/crm1 | **Meridian** | Executive / premium — dark navy + brass, icon-rail sidebar, calm KPI tiles |
| `gifftai-project/crm2` | github.com/Vaibhav6780/crm2 | **Flowbase** | Productivity / keyboard-driven — Linear/Notion-style, dense tables, Cmd/Ctrl+K command palette (`cmdk`) |
| `gifftai-project/crm3` | github.com/Vaibhav6780/crm3 | **Vantage** | Analytics / data-heavy — dark BI-terminal look, monospace numerics, funnel + charts everywhere |
| `gifftai-project/crm4` | github.com/Vaibhav6780/crm4 | **Kindred** | Relationship / timeline-focused — warm cream/terracotta, people-first, activity-feed timeline as primary UI |
| `gifftai-project/crm5` | github.com/Vaibhav6780/crm5 | **Podium** | Sales / pipeline-focused, gamified — bold colors, kanban board flagship, rep leaderboard, "Wins" |

Each repo was `git clone`d from its (originally empty) GitHub repo; `origin` remote is
already configured in every local folder.

## Common functional spec given to every build (terminology adapted per persona)

1. Accounts/Companies — list w/ search+filter+sort, full CRUD, detail page w/ related
   contacts, related pipeline items, notes/activity timeline.
2. Contacts/People — CRUD, linked to a company, detail page w/ related pipeline items +
   notes.
3. Leads/Pipeline/Deals — CRUD w/ a stage field (NEW/HOT/WARM/COLD/LOST/WON or renamed),
   value, owner, next-follow-up date, "contacted today" / "follow-ups due" filtered views,
   a first-class stage-change interaction (dropdown, inline, kanban drag, etc per persona).
4. Activities/Tasks — CRUD, type (call/email/meeting/todo), due date, status, linked to a
   company/contact/pipeline item, due/overdue view.
5. Notes — attachable to companies/contacts/pipeline items, shown in detail-page timelines.
6. Analytics/Reports dashboard — live KPI tiles + 2-3 charts (funnel by stage, value over
   time or by owner, activity volume) via `recharts`.
7. Settings — profile, mock team list, a couple of toggles, localStorage-persisted.
8. Global search + filter/sort on every list view.
9. Realistic static-TS seed data (no faker dependency): ~15-25 companies, ~30-50 contacts,
   ~30-50 pipeline items, ~40+ activities/notes.

**Tech stack (same across all 5):** React 18 + TypeScript + Vite, React Router, Tailwind
CSS (persona palette/typography via `tailwind.config` theme extension), Zustand +
`persist` middleware → localStorage, `recharts`, `lucide-react`. crm2 additionally uses
`cmdk` for its command palette; crm5 was directed to consider `@dnd-kit/core` for kanban
drag-and-drop.

**Deliverable checklist per repo:** scaffold at repo root (not nested), full working CRUD
wired to state, `npm install` + `npm run build` verified with zero TS errors, root
`README.md`, sensible `.gitignore`, one commit on `main` (created via `git branch -M main`
since repos started empty), pushed to `origin`. Commit message must end with:

```
Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Qy216Jctsh1t9mP5F5eYMR
```

## Status as of this file (2026-09-09, session limit hit)

Built **sequentially, one repo at a time**, per explicit user instruction (not in
parallel — an earlier parallel attempt across all 5 was stopped by the user, partly over
concern it would blow through the $20/mo Pro plan's usage limits, which it in fact did on
the 3rd repo).

| Repo | Status | Detail |
| --- | --- | --- |
| **crm1 (Meridian)** | ✅ **Done, pushed** | Committed on `main`, pushed to `origin/main`, `git status` clean, build verified (`npm run build` zero TS errors). 49 files. |
| **crm2 (Flowbase)** | ✅ **Done, pushed** | Committed on `main` (65 files, ~8100 lines), pushed to `origin/main`, clean. Build verified incl. `vite preview` smoke check. |
| **crm3 (Vantage)** | 🟡 **In progress, NOT committed** | ~34 source files already written on disk (App shell, sidebar/topbar, full UI kit — Modal/ConfirmDialog/DataTable/KpiTile/Sparkline/Badge, chart components for funnel/revenue/activity/pipeline-by-owner, form modals for company/contact/deal/activity, deal detail modal, notes timeline, Accounts+AccountDetail+Contacts+ContactDetail+Funnel pages, seed data, store, types). **Missing at minimum**: remaining pages (Tasks/Activity Log, Reports/Command Center, Admin/Settings — not yet listed in `src/pages`), row-click → deal detail wiring (was mid-edit when it stopped), a build/typecheck pass, and the git commit+push. No `.git` commits yet — `git log` on `main` shows no commits. |
| **crm4 (Kindred)** | 🟡 **In progress, NOT committed** | ~26 source files on disk (App shell, sidebar/topbar/mobile nav, global search, moments Timeline+MomentCard+MomentIcon, avatar/stage-pill/kpi-tile/modal/confirm-dialog/empty-state UI kit, seed/banks/team data, store, types). Was working on **entity forms for create/edit modals** when stopped — those form components likely don't exist yet (no `forms/` dir listed). No pages under `src/pages` yet at all — page-level wiring (Feed, People, Organizations, Journeys, Moments, Insights, Settings) still needed. No git commits yet.
| **crm5 (Podium)** | 🟡 **Barely started, NOT committed** | ~23 source files on disk: full UI kit (Avatar, ConfirmDialog, EmptyState, GlobalSearch, Layout, ListToolbar, Modal, NotesTimeline, PageHeader, Select, StageBadge), one form (`CompanyForm.tsx`), seed data (companies/contacts/deals/notes/reps/tasks), store, types, lib helpers. Was building the `GlobalSearch` component when first interrupted (by the user, before the rate limit hit), then briefly resumed and stopped again mid-way through a row-click handler for deal detail. **No pages exist yet at all** — this is the least-complete of the three unfinished repos. No git commits yet.

None of crm3/crm4/crm5 have run `npm install` yet as far as the session could confirm
(each agent was mid-scaffolding source files, not yet at the install/build/verify stage
for crm4 and crm5; crm3 got further but no confirmed successful build either) — check
`node_modules` presence and try `npm install && npm run build` first when resuming each,
before assuming what's broken vs just unfinished.

## How to resume

Build **one repo at a time**, not in parallel (explicit user preference, and the account's
usage window makes parallel heavy builds risky anyway). For each of crm3, crm4, crm5, in
order:

1. Re-brief a fresh agent (or continue in a new session) with: this file's persona
   description + common functional spec + tech stack + deliverable checklist for that repo,
   pointing it at the existing partial `src/` tree so it *continues* the existing
   scaffolding rather than starting over from scratch — the files listed above already
   exist and should be reviewed/kept, not discarded.
2. Have it finish all missing pages/wiring per persona, get `npm install` +
   `npm run build` to a clean zero-error state, verify functionality makes sense, then
   commit (`git branch -M main` since no commits exist yet) and `git push -u origin main`.
3. Confirm the push landed (`git status` clean, matches `origin/main`) before moving to the
   next repo.

Order to finish: **crm3 → crm4 → crm5** (matches how far along each already is).
