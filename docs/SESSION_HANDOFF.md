# Session handoff

Branch: `dynasty-themes` (not yet committed or pushed).

## Done on this branch
- Themes (`apps/game/game/themes.ts`): 12 in total. New: Chera, Chola, Pandya, Action Heroes, Mythic Warriors, Space Fleet, Pongal, Diwali, Christmas. Each theme sets card art, bot names, felt colours, backdrop and sound pack.
- Card art: `card-emblems.ts` (dynasty emblems), `card-figures.ts` (action-figure cast, shared name plate), `card-mythic.ts`, `card-fleet.ts`, `card-festivals.ts`. Registered in `card-art.ts`.
- Worlds: `backdrops.ts` (space, temple courtyard, neon city, festival sky with snow for Christmas). `stage.ts` swaps felt and world per theme.
- Win celebration: confetti (`effects.ts`), slow-motion rise of the winning card and a glow trail on flying cards (`scene.ts`).
- Sound packs per theme (`sound.ts`): classic, temple, action, space. All synthesized.
- Bots: `game/bots.ts` with easy, normal and hard levels; host picks "Bot skill" in the lobby. Autopilot now plays its first valid card (fixes a stall, see LESSONS.md).
- Reactions: fixed list in `help.ts`, server memory only (`rooms.ts`), bubbles over seat tags.
- Avatars: 10 heroes and 4 emblems (`avatars.ts`), picked in the lobby, saved with room members.
- Dynasty card backs: approved public-domain photos in `apps/game/public/cards/dynasty/` (credits in `CREDITS.md` there), drawn in the arch on Chera, Chola and Pandya backs. The emblem shows first and the photo paints in once loaded.
- Achievements: engine emits `achievement` events (comeback, combo, flawless); first win and match win come from results. Shown on the lobby page.

## Open
- Avengers, Power Rangers and real-person themes are blocked by the org IP rule until Legal confirms rights.
- `scene.ts` (493 lines) and `rooms.ts` (487) are close to the 500-line limit; split before adding more.
- `achievementsFor` scans `game_event` without an index on (actor_id, kind).
