#!/usr/bin/env bash
# GifftAI CRM production deploy — the ONLY blessed deploy path for this repo.
#
# Pulls main, rebuilds images with the prod compose overlay, and brings
# everything up bound on 127.0.0.1:<prod-port>. The main gifftai_official_web
# repo's own nginx (a separate host, separate deploy) must have its
# crm.gifftai.com upstream pointed at 127.0.0.1:3014 — see that repo's
# deploy/nginx/gifftai.conf. This script only ever touches the gifftai-crm
# Compose project; it never starts, stops, or rebuilds anything from the main
# gifftai stack, by design (see HANDOVER.md's removal runbook — the two
# stacks are meant to be independently deployable and independently
# removable).
#
# Refuses to run if docker-compose.prod.yml is missing — that prevents
# silently falling back to the dev compose (0.0.0.0-bound ports, dev
# Postgres/Redis/MinIO creds), mirroring the same guard in the main repo's
# scripts/deploy.sh.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# Guard: must run as the `gifftai` deploy user, never root. This repo is checked out
# and owned by gifftai; running this script as root (e.g. staying logged in as root over
# SSH and forgetting `su - gifftai -c ...`) makes `git pull` write files as root:root,
# which then makes the *next* correctly-run deploy fail with "Permission denied" on
# `git pull --ff-only` — this exact failure has already recurred across multiple
# sessions (see HANDOVER.md's 2026-08-09 and 2026-08-10 entries; traced via file mtimes
# to a root-run deploy on 2026-08-07). Fail fast here instead of letting it happen again.
if [[ "$(id -un)" != "gifftai" && "$(id -un)" != "swisdex" ]]; then
  echo "FATAL: this script must run as 'swisdex' or 'gifftai', not '$(id -un)'."
  echo "       Running it as root (or any other user) leaves files root-owned, which"
  echo "       breaks the *next* deploy's 'git pull --ff-only' with a permission error."
  echo "       Run it as: su - swisdex -c '$REPO_ROOT/scripts/deploygifftai.sh $*'"
  echo "       If ownership is already broken, first run as root:"
  echo "         chown -R swisdex:swisdex $REPO_ROOT"
  exit 1
fi

# Guard: prod overlay must exist. No silent dev-compose fallback.
[[ -f docker/docker-compose.yml      ]] || { echo "FATAL: docker/docker-compose.yml not found in $REPO_ROOT"; exit 1; }
[[ -f docker/docker-compose.prod.yml ]] || { echo "FATAL: docker/docker-compose.prod.yml missing — refusing to deploy"; exit 1; }

# Guard: real env file must exist — env_file: ../apps/api/.env is required by
# postgres/api/worker/migrate in docker-compose.prod.yml, and its absence
# fails those services with an unhelpful "env file not found" rather than
# explaining what to do about it.
if [[ ! -f apps/api/.env ]]; then
  echo "FATAL: apps/api/.env not found."
  echo "       Copy apps/api/.env.production to apps/api/.env (fill in its"
  echo "       two TODOs — SMTP creds and SEED_SUPER_ADMIN_EMAIL — first),"
  echo "       or generate a fresh one from apps/api/.env.example."
  exit 1
fi

PULL=1
BUILD=1
MIGRATE=1
SERVICES=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-pull)    PULL=0;    shift ;;
    --no-build)   BUILD=0;   shift ;;
    --no-migrate) MIGRATE=0; shift ;;
    --service)    SERVICES+=("$2"); shift 2 ;;
    -h|--help)
      cat <<EOF
Usage: $0 [--no-pull] [--no-build] [--no-migrate] [--service <name> [--service <name> ...]]

  --no-pull        Skip 'git pull origin main'
  --no-build       Skip docker compose build (use existing images)
  --no-migrate     Skip 'prisma migrate deploy'. Only use when you know the
                   DB is already on the right migration — leaving migrations
                   un-applied is the most common cause of post-deploy 500s
                   (api crashes on first query against a missing column),
                   same failure mode the main repo's deploy.sh guards against.
  --service <n>    Limit the BUILD step to specific service(s); the up step
                   always brings the full stack up. Repeatable.

Examples:
  $0                             # full deploy (rebuild + migrate + up everything)
  $0 --service web               # rebuild just the web frontend, up the full stack
  $0 --no-build --service api    # skip build entirely (--service is a no-op here)
  $0 --no-migrate                # rebuild + up, skip Prisma migrate
EOF
      exit 0 ;;
    *) echo "Unknown arg: $1 (try --help)"; exit 2 ;;
  esac
done

# --env-file is required here: env_file: ../apps/api/.env (used by the services
# themselves) is a separate mechanism from Compose's own ${VAR} interpolation in
# the YAML (e.g. docker-compose.prod.yml's POSTGRES_PASSWORD/S3_* required vars) —
# without this flag Compose falls back to a .env in the cwd, which doesn't exist,
# and every required-var interpolation fails at `docker compose build`.
COMPOSE=(docker compose --env-file apps/api/.env -f docker/docker-compose.yml -f docker/docker-compose.prod.yml)

echo "==> GifftAI CRM prod deploy"
echo "    Repo:    $REPO_ROOT"
echo "    Compose: docker/docker-compose.yml + docker/docker-compose.prod.yml"
echo
echo "    Prod port bindings (must match the crm.gifftai.com nginx upstream"
echo "    in gifftai-crm.conf on the server):"
echo "      127.0.0.1:3015  → web:80      (React app + internal /api, /socket.io proxy)"
echo "      127.0.0.1:4004  → api:4000    (direct-debug access only, not proxied externally)"
echo

if [[ $PULL -eq 1 ]]; then
  echo "==> git pull --ff-only origin main"
  git pull --ff-only origin main
fi

if [[ $BUILD -eq 1 ]]; then
  # Deliberately NOT --no-cache, unlike the main repo's deploy.sh: that
  # flag was the root cause of a 278GB build-cache disk-usage incident
  # there (see gifftai_official_web/HANDOVER.md, 2026-08-04) because it
  # writes fresh cache layers every deploy without ever reading old ones.
  # Regular cached builds are correct here as long as base images/deps
  # aren't expected to have drifted outside of what changed in git.
  echo "==> docker compose build"
  if [[ ${#SERVICES[@]} -gt 0 ]]; then
    "${COMPOSE[@]}" build "${SERVICES[@]}"
  else
    "${COMPOSE[@]}" build
  fi
fi

# Run pending migrations BEFORE bringing the stack up. The migrate service
# is profile-gated (won't auto-start with normal up), so it's invoked
# explicitly here. --exit-code-from migrate makes the run blocking and
# propagates Prisma's exit code — if a migration fails, abort the deploy
# instead of letting api/worker start against a stale schema and crash.
if [[ $MIGRATE -eq 1 ]]; then
  echo "==> docker compose --profile migrate up migrate  (prisma migrate deploy)"
  "${COMPOSE[@]}" --profile migrate up --build --exit-code-from migrate migrate
  # Clean up the one-shot container so it doesn't show in `ps` output.
  "${COMPOSE[@]}" --profile migrate rm -f migrate >/dev/null 2>&1 || true

  # Bootstrap-only seed: migrations create the schema but never populate it —
  # a fresh database has 0 users/roles/permissions until prisma/seed.ts runs,
  # and nothing else in this stack calls it (this bit us on the first-ever
  # real deploy: schema existed, `up -d` succeeded, but no login could work).
  # Only fires when `users` is actually empty because most of seed.ts is NOT
  # safe to re-run (see docker-compose.prod.yml's `seed` service comment).
  echo "==> Checking whether the database needs seeding"
  USER_COUNT="$("${COMPOSE[@]}" exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "SELECT count(*) FROM users;"' 2>/dev/null | tr -d '[:space:]')"
  if [[ "$USER_COUNT" == "0" ]]; then
    echo "==> users table is empty — running prisma/seed.ts (creates Super Admin, permissions, roles, etc.)"
    "${COMPOSE[@]}" --profile seed up --build --exit-code-from seed seed
    "${COMPOSE[@]}" --profile seed rm -f seed >/dev/null 2>&1 || true
  else
    echo "==> users table already has ${USER_COUNT:-a nonzero number of} row(s) — skipping seed"
  fi
fi

# `up -d` always runs over the FULL stack — even when --service narrowed the
# build. Compose is idempotent here: already-running containers with
# unchanged image/config are not touched, so this is safe to run regardless
# of prior state (same reasoning as the main repo's deploy.sh).
echo "==> docker compose up -d  (full stack — --service only scopes build)"
"${COMPOSE[@]}" up -d

echo
echo "==> Service state (verify 127.0.0.1:3014 / 127.0.0.1:4004 appear in PORTS):"
"${COMPOSE[@]}" ps --format "table {{.Service}}\t{{.Status}}\t{{.Ports}}"

echo
echo "==> Done. If any service shows 0.0.0.0:80 or 0.0.0.0:4000 in PORTS,"
echo "    the prod overlay didn't apply — DO NOT trust the deploy. Run:"
echo "      ${COMPOSE[*]} down && $0"
