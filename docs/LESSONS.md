# Lessons

## WebSocket stopped connecting after adding the `/[game]` route
- What: every page sat on "Connecting..." and the browser showed "Connection closed before receiving a handshake response".
- Root cause: the socket lived at `/ws`. The new dynamic `app/[game]` route also matches `/ws`, so Next's dev upgrade handling claimed the request before `server.ts` could finish its async session check.
- Prevention: keep the socket under `/api/ws`, where no page can match, and check `curl -o /dev/null -w "%{http_code}" localhost:3001/api/ws` gives 404 (no page) after adding top-level dynamic routes.

## Room page crashed: "useEffect must not return anything besides a function"
- What: the game page threw on load with "destroy is not a function".
- Root cause: effects written as one-line arrows (`useEffect(() => send(...))`) return the expression's value. When that value isn't undefined, React treats it as a cleanup and calls it.
- Prevention: give effects a block body unless the arrow returns a cleanup function on purpose.

## Hiding a CSS2DObject label with `style.display` did nothing
- What: the player's own name tag stayed on top of their hand.
- Root cause: `CSS2DRenderer` writes `element.style.display` on every frame from the object's visibility, overwriting ours.
- Prevention: hide CSS2D labels with `object.visible = false`, never through the element's style.

## Game container crashed: "Failed to load SWC binary for linux/arm64"
- What: the game image built but exited on start.
- Root cause: the build stage (oven/bun, Debian/glibc) installed glibc SWC binaries; the runtime stage was Alpine (musl). The custom server loads `next.config.ts` at runtime, which needs SWC.
- Prevention: keep build and runtime stages on the same libc when the runtime runs Next itself (not the standalone output).

## Darkening unplayable cards had almost no visible effect
- What: tinting card materials (even to 16%) and then a dark overlay barely changed how the cards looked.
- Root cause: ACES tone mapping with strong lights flattens tints; the overlay (transparent, no depth write) sometimes drew before the card and was painted over; and the overlay texture's colour didn't come through, only its alpha.
- Prevention: for overlays on transparent meshes set `renderOrder` explicitly, use `toneMapped: false`, and set the colour on the material with the texture only giving the shape.

## Opening a finished table's link spun on "Joining..." forever
- What: the server's "No open table" error was dropped because the page only rendered errors once a room had loaded.
- Root cause: the error toast lived inside the loaded-room layout.
- Prevention: every screen that waits on the server must render its error state too.

## Sign-in and sign-up forms rendered unstyled (full width, no spacing)
- What: the shared auth form's layout classes (`max-w-sm`, `mt-16`, `space-y-*`) were missing in both apps.
- Root cause: Tailwind v4 only scans the app's own files plus sources registered with `@source`. `packages/ui` registers itself; `packages/auth` didn't, so classes used only there were never generated.
- Prevention: every workspace package with Tailwind classes ships a `styles.css` with `@source "./"`, and apps import it.

## A played card kept glowing on the discard pile
- What: the gold "playable" halo (and the dark veil) stayed on a card after it moved from your hand to the pile.
- Root cause: the scene reuses one card object as it moves; only the hand loop set the glow and veil visibility, so the pile kept whatever the hand last set.
- Prevention: when a card object can move between zones, every zone's loop sets all per-card overlays it doesn't want, not only the ones it uses.

## Games could stall forever when two or more players were on autopilot
- What: autopilot (a human who left or timed out) only ever drew. Two such seats soaked up the whole deck until the draw pile and discard were empty and the remaining players could only shuffle the last couple of cards around, so the round never ended.
- Root cause: "draw instead of play" was meant to stop autopilot winning for an absent player, but drawing without limit removes cards from circulation.
- Prevention: anything the server plays on a player's behalf must still shed cards. Autopilot now plays its first valid card and never calls "WILDCARD!" (so others can still catch it). The bot test runs every level, autopilot included, in every mode.
