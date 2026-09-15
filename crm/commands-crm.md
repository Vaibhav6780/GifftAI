# GifftAI CRM — SSH/DB Session Log (2026-08-22)

What was done this session, why, and exactly what each command does. Written so a future
reader (including future-you) can reproduce or audit this without re-deriving it.

## Context gathered first

Read the two top-level docs to understand the deploy/SSH/DB layout before touching
anything:
- `HANDOVER.md` — confirms the prod server is `root@187.127.160.221`, the deploy user is
  `gifftai` (never `root` — see the ownership-bug history in that file), the app lives at
  `/opt/gifftai-crm`, and Postgres/Redis/MinIO run as Docker Compose services with no
  public port bindings (only reachable from inside the Docker network or via `docker
  compose exec`).
- `LEAD_INGESTION.md` — lead pipeline reference, not directly relevant to this task but
  read per the "read all md files" instruction.

## Goal

Find the user `developer.gifftai@gmail.com` in the production database and inspect/fix
their `attendance_sessions` rows for today (2026-08-22): remove a duplicate REMOTE session
and correct the surviving OFFICE session's login time to 12:30 PM IST.

## 1. Confirm SSH access

```bash
ssh -o BatchMode=yes -o ConnectTimeout=8 -o StrictHostKeyChecking=accept-new \
  root@187.127.160.221 "echo CONNECTED && whoami"
```
**What it does**: opens a non-interactive SSH session to the prod box as `root` and runs
two harmless commands to prove connectivity/identity.
**Why**: sanity-check before doing anything real — confirms the key-based SSH access
`HANDOVER.md` describes still works.

## 2. Check the Docker Compose stack is up

```bash
ssh root@187.127.160.221 "su - gifftai -c 'cd /opt/gifftai-crm && \
  docker compose --env-file apps/api/.env \
    -f docker/docker-compose.yml -f docker/docker-compose.prod.yml \
    ps --format \"table {{.Service}}\t{{.Status}}\"'"
```
**What it does**:
- `su - gifftai -c '...'` — switches from the root SSH session to the `gifftai` deploy
  user before touching the repo, matching the mandatory convention in
  `scripts/deploycrm.sh` (running Compose as root leaves root-owned files that break the
  *next* `git pull`).
- `docker compose --env-file apps/api/.env -f docker-compose.yml -f
  docker-compose.prod.yml ps` — lists every service in the stack (postgres, redis, minio,
  api, worker, web) and its status. `--env-file apps/api/.env` is required because
  `docker-compose.prod.yml` interpolates `${POSTGRES_PASSWORD}`, `${S3_ACCESS_KEY}`, etc.
  at parse time — without it, Compose can't even parse the file (confirmed: first attempt
  without `--env-file` failed with "POSTGRES_PASSWORD is required").
**Why**: confirms `postgres` is up and healthy before trying to query it, and confirms the
exact two-compose-file invocation needed (same one `deploycrm.sh` uses internally).

## 3. Inspect the `users` table schema

```sql
\d users
```
run via:
```bash
docker compose --env-file apps/api/.env -f docker/docker-compose.yml \
  -f docker/docker-compose.prod.yml exec -T postgres psql -U gifftai -d gifftai_crm -c "\d users"
```
**What it does**: `docker compose exec -T postgres psql -U gifftai -d gifftai_crm` opens a
non-interactive `psql` session inside the running `postgres` container, connecting as the
`crm` role to the `gifftai_crm` database (both names are the Compose defaults set in
`docker-compose.prod.yml`: `POSTGRES_USER:-gifftai`, `POSTGRES_DB:-gifftai_crm`). `-T` disables
pseudo-TTY allocation, needed because this is a scripted/non-interactive `docker exec`.
`\d users` is `psql`'s meta-command to print a table's column list, types, indexes, and
foreign keys.
**Why**: an earlier query guessed a `"isActive"` column that doesn't exist (the real column
is `status` of enum type `UserStatus`) — checked the real schema instead of guessing again.

## 4. Find the user by email

```sql
SELECT id, email, "firstName", "lastName", status
FROM users
WHERE email = 'developer.gifftai@gmail.com';
```
**What it does**: a plain `SELECT` filtered on the unique `email` column (there's a
`users_email_key` unique index, so this returns at most one row). Column names are
double-quoted (`"firstName"`) because Postgres folds unquoted identifiers to lowercase, and
this schema's columns are camelCase (Prisma's default mapping) — without the quotes,
Postgres would look for a column literally named `firstname` and fail.
**Result**: one row —
`id = cmskdhrdk002wt501ilp0vazi, firstName = vaibhav, lastName = sharma, status = ACTIVE`.
**Why**: the user's `id` is the foreign key every other table (including
`attendance_sessions`) references — needed it before any attendance query could be scoped
to the right person.

## 5. Inspect the `attendance_sessions` table schema

```sql
\d attendance_sessions
```
**What it does**: same meta-command as step 3, applied to `attendance_sessions`. Showed
columns `id, userId, ip, onlineAt, offlineAt, createdAt, updatedAt, location
("AttendanceLocation" enum: OFFICE/REMOTE), extendedExitTime`, plus a **partial unique
index** `attendance_sessions_open_userId_key` on `userId` WHERE `offlineAt IS NULL` — i.e.
the schema itself enforces "at most one open (not-yet-clocked-out) session per user" at the
database level.
**Why**: confirms the real table name (the ask said "attendance table"; the actual table —
per `HANDOVER.md`'s "Extend Hours" section and this schema dump — is `attendance_sessions`,
paired with a separate `attendance_requests` table for WFH/leave approvals, not queried
here) and its exact column names before writing further queries.

## 6. List the user's attendance sessions

```sql
SELECT id, "onlineAt", "offlineAt", ip, location, "extendedExitTime"
FROM attendance_sessions
WHERE "userId" = 'cmskdhrdk002wt501ilp0vazi'
ORDER BY "onlineAt" DESC
LIMIT 20;
```
**What it does**: all sessions for that one user, most recent first. `ORDER BY "onlineAt"
DESC` sorts by clock-in time descending; `LIMIT 20` caps output since this is exploratory.
**Result**: 11 total rows going back to 2026-08-08, including **two rows for today
(2026-08-22)**: one `OFFICE` session still open (`offlineAt` null, `onlineAt` 07:28:59.584
UTC) and one `REMOTE` session that opened and closed 2.5 seconds apart
(07:28:19.676 → 07:28:22.136 UTC) — clearly a duplicate/test artifact, not a real second
work session.
**Why**: this is the "find developer.gifftai@gmail.com [in the] attendance table" part of
the original ask — establishes what data actually exists before any cleanup.

## 7. Aggregate check

```sql
SELECT count(*) AS total_sessions, min("onlineAt") AS first_seen, max("onlineAt") AS last_seen
FROM attendance_sessions
WHERE "userId" = 'cmskdhrdk002wt501ilp0vazi';
```
**What it does**: `count(*)` / `min()` / `max()` aggregate functions over the same
per-user filter — confirms the row count (11) and the full date range (2026-08-08 through
2026-08-22) without listing every row.
**Why**: sanity check that step 6's `LIMIT 20` wasn't hiding any older rows (it wasn't —
11 < 20).

## 8. Delete the duplicate REMOTE session (today only)

User confirmed explicitly before this ran, given it's a direct, irreversible write against
the production database.

```sql
DELETE FROM attendance_sessions WHERE id = 'cmt423t9800alqo01zxmbeehr';
```
**What it does**: removes exactly one row, targeted by its primary key (`id`) — the safest
possible `DELETE` predicate, since `id` is guaranteed unique (`attendance_sessions_pkey`).
Postgres reported `DELETE 1`, confirming exactly one row was removed, not zero or more than
one.
**Why**: the user asked to remove today's spurious REMOTE entry, keeping only the real
OFFICE session. Targeted by the specific row's own `id` (captured in step 6) rather than a
broader `WHERE userId = ... AND location = 'REMOTE' AND onlineAt::date = ...` condition, to
guarantee only that exact row could ever be affected — deliberately avoided any predicate
that could match a REMOTE row on a different day if the id were somehow wrong.

## 9. Correct the surviving OFFICE session's login time

```sql
UPDATE attendance_sessions
SET "onlineAt" = TIMESTAMP '2026-08-22 07:00:00.000'
WHERE id = 'cmt424o1s00arqo01shk8peuf';
```
**What it does**: updates the `onlineAt` column of exactly one row (again targeted by
primary key) to a literal timestamp. `TIMESTAMP '2026-08-22 07:00:00.000'` is a Postgres
timestamp literal in the column's own type (`timestamp(3) without time zone` — no
timezone conversion happens in the database itself; the column stores whatever wall-clock
value is given). Postgres reported `UPDATE 1`.
**Why the specific value**: the ask was "12:30 PM login." Every time-of-day rule already in
this codebase (`OVERTIME_EXTENSION_TIME` default `20:00`, half-day cutoff 10:30 AM, both
documented in `HANDOVER.md`) is expressed and enforced in **IST**, with explicit "UTC+5:30
offset math, not `Date.getHours()`" noted specifically because the API container itself
runs in UTC. This column is stored the same way (values here were UTC — e.g. the original
`07:28:59.584` displayed elsewhere in the app as the IST-converted `12:58:59 PM`). So
"12:30 PM" was interpreted as **12:30 PM IST**, which converts to **07:00:00 UTC**
(12:30 − 5:30). User confirmed this interpretation (vs. a literal 12:30 UTC) before the
write ran.

## 10. Verify the end state

```sql
SELECT id, "onlineAt", "offlineAt", ip, location
FROM attendance_sessions
WHERE "userId" = 'cmskdhrdk002wt501ilp0vazi'
  AND "onlineAt" >= '2026-08-22'
ORDER BY "onlineAt" DESC;
```
**What it does**: re-runs the per-user query from step 6, narrowed with `"onlineAt" >=
'2026-08-22'` (a date-literal lower bound — Postgres compares it against the timestamp
column directly) so only today's row(s) show.
**Result**: exactly one row — `cmt424o1s00arqo01shk8peuf`, `onlineAt = 2026-08-22
07:00:00`, `offlineAt` still null (session still open), `location = OFFICE`. Confirms both
the delete and the update landed correctly and nothing else on today was touched.
**Why**: never trust a write without re-reading it back — especially on a production
database with no automatic undo.

## Summary of net effect

- User: `developer.gifftai@gmail.com` (Vaibhav Sharma, id `cmskdhrdk002wt501ilp0vazi`).
- Before: two `attendance_sessions` rows for 2026-08-22 (one OFFICE, open; one REMOTE,
  open+closed 2.5s later).
- After: one row — OFFICE, still open, `onlineAt` corrected to 07:00:00 UTC (12:30 PM
  IST). No other date's rows were touched (11 total rows → 10 total rows for this user).
- Nothing was deployed, migrated, or restarted — this was a direct data fix via `psql`
  inside the already-running `postgres` container, not an application-level change.
