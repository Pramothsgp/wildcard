# Builds one service: docker build --build-arg SERVICE=<name> .
# A service can ship its own apps/<name>/Dockerfile instead (CI prefers it).
FROM oven/bun:1.4 AS build
WORKDIR /repo
ARG SERVICE
ENV NEXT_TELEMETRY_DISABLED=1
COPY . .
RUN bun install --frozen-lockfile
RUN bunx turbo run build --filter=@repo/${SERVICE}
# Migrations as one plain-Node file, so the runtime image needs no Bun or drizzle-kit.
RUN bun build packages/data/migrate.ts --target=node --outfile=/out/migrate.mjs

FROM node:24-alpine
WORKDIR /app
ARG SERVICE
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=8080 HOSTNAME=0.0.0.0 \
    MIGRATIONS_DIR=/app/drizzle SERVICE=${SERVICE}
COPY --from=build --chown=node:node /repo/apps/${SERVICE}/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/${SERVICE}/.next/static ./apps/${SERVICE}/.next/static
COPY --from=build --chown=node:node /repo/apps/${SERVICE}/public ./apps/${SERVICE}/public
COPY --from=build /repo/packages/data/drizzle ./drizzle
COPY --from=build /out/migrate.mjs ./migrate.mjs
USER node
EXPOSE 8080
CMD ["sh", "-c", "node migrate.mjs && exec node apps/$SERVICE/server.js"]
