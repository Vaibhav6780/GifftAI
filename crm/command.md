# GifftAI CRM — WFH request insert for developer.gifftai@gmail.com (2026-09-02)

**Status: NOT RUN.** This file documents the exact commands to raise a Work-From-Home
attendance request for `developer.gifftai@gmail.com` by writing directly to the production
database, because the normal path is unavailable (see "Why direct DB" below). Review, then
run manually if you want it done.

---

## What is being requested

| Field | Value |
| --- | --- |
| User | `developer.gifftai@gmail.com` — Vaibhav Sharma, `id cmskdhrdk002wt501ilp0vazi`, status ACTIVE |
| `type` | `WORK_FROM_HOME` |
| `date` | `2026-09-02` (today, stored as UTC-midnight `2026-09-02T00:00:00.000Z` per `dateOnlyToUtcMidnight`) |
| `reason` | `Due to a high workload and pending deliverables, I would like to request work from home to focus on completing the assigned tasks efficiently and on time.` |
| `status` | `PENDING` (default) |
| `createdAt` / `updatedAt` | `2026-09-02T06:20:00.000Z` — i.e. **11:50 AM IST** (IST = UTC+5:30). This is the actual submission time, not a backdate. |

## Why direct DB (and what that skips)

The normal flow is the CRM UI → `POST /api/attendance-requests` → `attendanceRequestsService.create`.
That path is **not usable here**:

- **9:45 AM server-local cutoff** (`packages/shared/src/lib/attendanceRequestCutoff.ts`).
  Prod server runs in UTC; server time is ~06:20 UTC = **11:50 AM IST**, well past the
  cutoff, so the API would reject with `400 "Attendance requests must be submitted before
  9:45 AM"`.
- Claude-in-Chrome extension is not connected, so the UI can't be driven as that user.

A direct `INSERT` therefore **bypasses**:

1. **Authentication** — no session for that user is used.
2. **The 9:45 AM cutoff** — enforced only in the service layer, not the DB.
3. **The audit log** — `attendanceRequestsService.create` also writes an
   `attendance_request.create` row to `audit_logs`; the commands below do **not**. Add one
   by hand if you need the trail (needs `userId`, `action`, `entityType`, `entityId`, plus
   `ip`/`userAgent` from `RequestMeta`).

What it still respects: the `attendance_requests_userId_date_key` unique index (one request
per user per day) — step 2 checks for an existing row first, and the Prisma `create` in
step 3 will error on the unique constraint if one exists.

## Prod access facts (from `commands-crm.md` / `HANDOVER.md`)

- SSH: `root@187.127.160.221`. Run repo/compose commands as the `gifftai` deploy user
  (`su - gifftai -c '...'`), never as `root` (root-owned files break the next `git pull` —
  see `HANDOVER.md`).
- App dir: `/opt/gifftai-crm`. Postgres/Redis/MinIO are Docker Compose services, no public
  ports — reach Postgres only via `docker compose exec postgres psql`.
- Compose invocation needs both files **and** `--env-file apps/api/.env` (the prod file
  interpolates `${POSTGRES_PASSWORD}` etc. at parse time):
  ```
  docker compose --env-file apps/api/.env \
    -f docker/docker-compose.yml -f docker/docker-compose.prod.yml <cmd>
  ```
- DB: user `gifftai`, database `gifftai_crm` (Compose defaults).

---

## Step 1 — confirm SSH + server clock

```bash
ssh -o BatchMode=yes -o ConnectTimeout=8 -o StrictHostKeyChecking=accept-new \
  root@187.127.160.221 "echo CONNECTED && date -u"
```

**Why:** sanity-check access and confirm the server is in UTC (so the `06:20:00Z` = 11:50
IST conversion in step 3 is right).

## Step 2 — verify the user and that no request exists for today

Write the query to a temp file on the server (avoids shell-quoting hell), then run it:

```bash
ssh root@187.127.160.221 'cat > /tmp/wfh-check.sql <<"SQL"
SELECT id, email, "firstName", "lastName", status
FROM users WHERE email = '"'"'developer.gifftai@gmail.com'"'"';

SELECT id, "userId", date, type, status, reason, "createdAt"
FROM attendance_requests
WHERE "userId" = (SELECT id FROM users WHERE email = '"'"'developer.gifftai@gmail.com'"'"')
ORDER BY date DESC LIMIT 10;
SQL'

ssh root@187.127.160.221 'su - gifftai -c '"'"'cd /opt/gifftai-crm && docker compose --env-file apps/api/.env -f docker/docker-compose.yml -f docker/docker-compose.prod.yml exec -T postgres psql -U gifftai -d gifftai_crm -f - < /tmp/wfh-check.sql'"'"''
```

**Expected:** one user row (`id = cmskdhrdk002wt501ilp0vazi`), and **no** `attendance_requests`
row with `date = 2026-09-02`. If a row for today already exists, **stop** — the request is
already in, and the unique index will block a second one.

## Step 3 — insert the request (mirrors `attendanceRequestsService.create`)

Uses the `api` container's Prisma client so the `id` (cuid) and column types are generated
exactly as the app would. Write the script to a file, pipe it to `node` in the container:

```bash
ssh root@187.127.160.221 'cat > /tmp/wfh-insert.js <<"JS"
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

const userId = "cmskdhrdk002wt501ilp0vazi";
const date = new Date("2026-09-02T00:00:00.000Z");        // dateOnlyToUtcMidnight("2026-09-02")
const at = new Date("2026-09-02T06:20:00.000Z");          // 11:50 AM IST — actual submission time
const reason =
  "Due to a high workload and pending deliverables, I would like to request work from home to focus on completing the assigned tasks efficiently and on time.";

(async () => {
  const existing = await p.attendanceRequest.findUnique({
    where: { userId_date: { userId, date } },
  });
  if (existing) {
    console.log("ALREADY EXISTS — not inserting:", JSON.stringify(existing, null, 2));
    return;
  }
  const row = await p.attendanceRequest.create({
    data: {
      userId,
      date,
      type: "WORK_FROM_HOME",
      reason,
      status: "PENDING",
      createdAt: at,
      updatedAt: at,
    },
  });
  console.log("CREATED:", JSON.stringify(row, null, 2));
})()
  .catch((e) => {
    console.error("FAILED:", e);
    process.exit(1);
  })
  .finally(() => p.$disconnect());
JS'

ssh root@187.127.160.221 'su - gifftai -c '"'"'cd /opt/gifftai-crm && docker compose --env-file apps/api/.env -f docker/docker-compose.yml -f docker/docker-compose.prod.yml exec -T api node - < /tmp/wfh-insert.js'"'"''
```

**Expected:** `CREATED: { ... }` with a fresh `id`, `status: "PENDING"`, the reason text,
`date` `2026-09-02T00:00:00.000Z`, `createdAt`/`updatedAt` `2026-09-02T06:20:00.000Z`.

### Raw-SQL alternative for step 3

Only if the `api` container route fails. `id` and `updatedAt` have **no DB default**, so
both must be supplied. Generate a cuid-shaped id first:

```bash
ssh root@187.127.160.221 'su - gifftai -c '"'"'cd /opt/gifftai-crm && docker compose --env-file apps/api/.env -f docker/docker-compose.yml -f docker/docker-compose.prod.yml exec -T api node -e "console.log((\"c\"+Date.now().toString(36)+Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2)).slice(0,25))"'"'"''
```

Then substitute it for `<CUID>` below and run:

```sql
INSERT INTO attendance_requests
  (id, "userId", date, type, reason, status, "createdAt", "updatedAt")
VALUES
  ('<CUID>',
   'cmskdhrdk002wt501ilp0vazi',
   DATE '2026-09-02',
   'WORK_FROM_HOME',
   'O3dzbQs0ErXVXobTyryYR8q93YlqVSZeyXsB6x54Wjk0rAgj#h2zlxR4S_pCXNLRCwIFH2XDqQIzlp5hfZ5kjMiXIfuE
   'PENDING',
   TIMESTAMP '2026-09-02 06:20:00',
   TIMESTAMP '2026-09-02 06:20:00');
```

(`TIMESTAMP` literals are stored as-is in the `timestamp(3) without time zone` columns, same
UTC-instant convention the rest of the schema uses — `06:20:00` UTC = 11:50 AM IST.)

## Step 4 — verify

```bash
ssh root@187.127.160.221 'cat > /tmp/wfh-verify.sql <<"SQL"
SELECT id, "userId", date, type, status, "createdAt", "updatedAt", left(reason, 60) AS reason_head
FROM attendance_requests
WHERE "userId" = '"'"'cmskdhrdk002wt501ilp0vazi'"'"' AND date = DATE '"'"'2026-09-02'"'"';
SQL'

ssh root@187.127.160.221 'su - gifftai -c '"'"'cd /opt/gifftai-crm && docker compose --env-file apps/api/.env -f docker/docker-compose.yml -f docker/docker-compose.prod.yml exec -T postgres psql -U gifftai -d gifftai_crm -f - < /tmp/wfh-verify.sql'"'"''
```

**Expected:** exactly one row, `status = PENDING`, `type = WORK_FROM_HOME`.

Then check it surfaces in the app: **WFH/Leave Requests** page for that user, and
**WFH/Leave Approvals** for a Super Admin.

## Undo

```sql
DELETE FROM attendance_requests WHERE id = '<the id from step 3/4>';
```

Target by primary key only. `DELETE 1` = done.

## Cleanup

```bash
ssh root@187.127.160.221 'rm -f /tmp/wfh-check.sql /tmp/wfh-insert.js /tmp/wfh-verify.sql'
```
