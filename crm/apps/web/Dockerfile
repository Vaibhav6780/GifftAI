# Build context is the repo root (monorepo workspace packages are referenced via
# workspace:* and must be visible to the install step).
ARG VITE_API_URL=/api

FROM node:22-alpine AS build
RUN corepack enable && corepack prepare pnpm@11.17.0 --activate
WORKDIR /repo

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/config packages/config
COPY packages/shared packages/shared
COPY apps/web apps/web

RUN pnpm install --frozen-lockfile
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
RUN pnpm --filter @gifftai/shared build && pnpm --filter @gifftai/web build

FROM nginx:1.27-alpine AS runtime
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
COPY docker/nginx/nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
