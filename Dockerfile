# syntax=docker/dockerfile:1
#
# Ledge production image (CLAUDE.md §12). Multi-stage, Next.js standalone output, non-root.
#
#   docker build -t ledge-app .                      # the app (default target: runner)
#   docker build --target migrator -t ledge-migrate . # the one-shot database migration job
#
# Building needs internet access once: pnpm downloads packages and next/font downloads the fonts
# (it saves them into the build, so the running app never contacts Google).

ARG NODE_VERSION=26

# ---- base: Node plus the exact pnpm version from package.json ------------------------------------
FROM node:${NODE_VERSION}-alpine AS base
# Node 25+ no longer ships corepack, so install the pinned pnpm directly.
RUN npm install -g pnpm@12.18.0
WORKDIR /app

# ---- deps: every dependency (dev ones too: the build and the migration job need them) -----------
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile

# ---- builder: compile the app -------------------------------------------------------------------
FROM deps AS builder
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# `next build` loads the server code, which validates its environment. These are throw-away
# placeholders for the build only: this stage is not shipped, and nothing here is a real secret.
ENV DATABASE_URL=postgres://build:build@localhost:5432/build \
    BETTER_AUTH_SECRET=build-time-placeholder-not-a-secret-0123456789 \
    BETTER_AUTH_URL=http://localhost:3000
RUN pnpm build

# ---- migrator: applies the database migrations, then exits --------------------------------------
FROM deps AS migrator
COPY drizzle.config.ts ./
COPY src/server/db ./src/server/db
CMD ["pnpm", "db:migrate"]

# ---- runner: the small image that actually runs ------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
WORKDIR /app
# A user with no shell and no home, so the app does not run as root.
RUN addgroup -S ledge && adduser -S -G ledge -H -s /sbin/nologin ledge
COPY --from=builder --chown=ledge:ledge /app/.next/standalone ./
COPY --from=builder --chown=ledge:ledge /app/.next/static ./.next/static
COPY --from=builder --chown=ledge:ledge /app/public ./public
USER ledge
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "server.js"]
