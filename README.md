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

## Game night (`apps/game`)

Three multiplayer games, WebSocket play, Postgres for everything. The home page lists the games; each lives under its own path with its own lobby, stats, leaderboard and history:

- `/wildcard`: a 3D shedding card game on a Three.js table.
- `/imposter`: everyone but the imposter knows the secret word. Clue laps, a vote, then the imposter's last guess (`game/imposter.ts`, words in `game/words.ts`).
- `/village` (Night Village): hidden roles. Wolves, a seer and a healer act at night; everyone votes by day (`game/village.ts`).

Each game has `/<game>/room/<code>`, `/<game>/leaderboard` and `/<game>/history`. Old `/room/<code>` links redirect to the right game. Every game seats up to 20; big Wildcard tables shuffle in extra decks.

- `server.ts` runs Next.js and the `/api/ws` WebSocket on one port (under `/api` so no page route can match it). Run with Node (it strips the types). The service has its own `Dockerfile` for this.
- `game/engine.ts` holds the rules as pure functions on plain JSON state; `game/engine.test.ts` covers them (`bun run test`).
- `game/party.ts` is the one entry point for Imposter and Night Village; `game/party.test.ts` covers both. Secret moves (night picks, votes before they close) are never written to the event log, so the history page can't leak them mid-game.
- `game/rooms.ts` keeps live rooms in memory and saves the full room snapshot plus new log events to Postgres after every action, before players see the change. On start it reloads every live room, so a crash or deploy resumes games where they were.
- Closing the tab or losing connection keeps your seat. The turn clock plays for you if you're away on your turn (autopilot); open the site again and the lobby shows a "Rejoin" banner. If every human is offline the game pauses.
- Modes: Classic, Stack Attack, Seven-O, Jump-In, House Party, Flipside (double-sided deck), Ruthless (168 cards, knock-out at 25), Speed. Each rule can be toggled in the room lobby.
- Points: winning a round scores the cards left in other hands; winning a match adds 100. Points and leaderboards are per game. Every room's full event log is at `/<game>/history/<code>` for the players who sat there.
- Card artwork is drawn on a canvas at runtime (`components/game/card-art.ts`), an original design. No third-party card art or branding is used.

Tables: `room` (snapshot), `room_member` (who sits where, for rejoin), `game_event` (append-only log), `result` (round and match points).

Live state is in memory, so the game service must run as one instance (`maxScale: 1` and session affinity are already set in the deployments repo). More instances need shared state first.
