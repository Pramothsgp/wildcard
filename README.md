# App template

Bun + Turborepo monorepo. Each folder in `apps/` is one Cloud Run service.

```
apps/<name>        services (created from starters/, not by hand)
packages/auth      better-auth: getAuth(), sign-in UI, requireSession/requireAdmin
packages/data      Drizzle + Postgres (pg), schema, migrations
packages/ui        shared components and theme (Tailwind v4)
starters/web|admin what new services are copied from
```

## Services

Services come from `platform/apps.yaml`. Terraform writes them to `.platform/services`, and the platform's terraform workflow creates any missing `apps/<name>` from `starters/`. To try one locally without the platform: `bun run new-service <name> <web|admin>`.

## Local development

```bash
bun install
bun run db:up                         # Postgres in Docker
cp apps/<name>/.env.example apps/<name>/.env.local   # set BETTER_AUTH_SECRET
bun run db:migrate
bun run dev
```

Admins: emails in `ADMIN_EMAILS` get the admin role, but only when they sign in with Google (a verified email). Password sign-up with an admin email is refused. Without Google locally, promote a user with:
`psql postgres://app:app@localhost:5432/app -c "update \"user\" set role='admin' where email='you@example.com'"`

## Database changes

Edit or add files in `packages/data/schema/`, export them from `schema/index.ts`, then `bun run db:generate` and commit the new file in `packages/data/drizzle/`. Migrations run automatically when a service starts (under a Postgres lock, so several services starting together are safe).

## Deploys

Push to `main`: CI lints, typechecks, tests, builds one image per service, pushes them and bumps the dev files in the `deployments` repo. Prod goes through the `promote` workflow there.

A service with special needs (e.g. a custom server) can add its own `apps/<name>/Dockerfile`; CI uses it instead of the root one.
