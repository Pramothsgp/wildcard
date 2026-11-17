# Session handoff

Branch: `party-games` (from `main`). Not committed or pushed yet.

## Done on this branch
- Two new games next to Wildcard: Imposter and Night Village. Engines in `apps/game/game/imposter.ts` and `village.ts`, shared bits in `party-core.ts`, client-safe names/options/views in `party-meta.ts`, dispatch in `party.ts`. Bots play both.
- Routes: `/` lists the games. Each game has `/<game>` (stats, achievements, create/join, top players), `/<game>/room/<code>`, `/<game>/leaderboard`, `/<game>/history`, `/<game>/history/<code>`. Stats, leaderboards and history are filtered per game by `room.mode` (party rooms store their kind there). Old `/room/<code>` links redirect.
- The game of a table is fixed when it opens (it is in the URL); the server ignores later changes to it.
- Party games use `components/game/party-stage.tsx` (spotlit room for Imposter, night/day village for Night Village) and `party.tsx` (panel, lobby options, rules), not the 3D table.
- Up to 20 players in every game. Wildcard adds decks as needed; wolves and imposters scale with the table.
- WebSocket moved from `/ws` to `/api/ws` (see LESSONS.md).
- `rooms.ts` split: input cleaning in `clean.ts`, per-player view in `view.ts`.

## Open
- An away player's clue turn in Imposter is skipped after 3s; away voters still hold the vote until its clock runs out.
- Players who are out in Night Village can still chat (honour system).
- If every human goes offline the game pauses, but a party phase clock that ran out meanwhile ends that phase as soon as someone returns.
- Avengers, Power Rangers and real-person themes are still blocked until Legal confirms rights.
- `scene.ts` (493 lines) and `hud.tsx` (483) are close to the 500-line limit.
- `achievementsFor` scans `game_event` without an index on (actor_id, kind).

## Earlier: themes-v2

Branch: `themes-v2` (from `dynasty-themes`, which is committed). Not yet committed or pushed.
