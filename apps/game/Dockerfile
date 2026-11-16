# Game service: Next.js plus a WebSocket server (server.ts), so it can't use the
# standalone output the root Dockerfile copies. Build from the repo root:
#   docker build -f apps/game/Dockerfile --build-arg SERVICE=game .
FROM oven/bun:1.4 AS build
WORKDIR /repo
ENV NEXT_TELEMETRY_DISABLED=1
COPY . .
RUN bun install --frozen-lockfile
RUN bunx turbo run build --filter=@repo/game
RUN bun build packages/data/migrate.ts --target=node --outfile=/out/migrate.mjs

# ponytail: ships the whole workspace with node_modules (bigger image). Prune dev deps if size matters.
# Debian like the bun build stage: Next loads its native SWC binary at runtime, and Alpine (musl) has none installed.
FROM node:24-slim
WORKDIR /repo
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=8080 HOSTNAME=0.0.0.0 \
    MIGRATIONS_DIR=/repo/packages/data/drizzle
COPY --from=build --chown=node:node /repo /repo
COPY --from=build /out/migrate.mjs /repo/migrate.mjs
USER node
EXPOSE 8080
CMD ["sh", "-c", "node migrate.mjs && cd apps/game && exec node server.ts"]
