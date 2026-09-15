# Build context is the repo root (monorepo workspace packages are referenced via
# workspace:* and must be visible to the install step).
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@11.17.0 --activate
WORKDIR /repo

FROM base AS build
ENV CI=true
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/config packages/config
COPY packages/shared packages/shared
COPY apps/api apps/api

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @gifftai/shared build \
  && pnpm --filter @gifftai/api prisma:generate \
  && pnpm --filter @gifftai/api build
# NOTE: `pnpm prune --prod` on a workspace strips packages that other workspace
# members (e.g. tsx, prisma CLI) still need at their own build time, and doing it
# post-build here was observed to remove runtime deps (e.g. express) too. Shipping
# devDependencies in the image is a deliberate size/simplicity tradeoff for Phase 1;
# revisit with `pnpm deploy` in Phase 20 (Production Deployment).

FROM node:22-alpine AS runtime
RUN addgroup -S app && adduser -S app -G app
WORKDIR /repo
COPY --from=build --chown=app:app /repo ./
USER app
WORKDIR /repo/apps/api
ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "dist/server.js"]

FROM runtime AS worker
CMD ["node", "dist/worker.js"]
