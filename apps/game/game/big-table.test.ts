import { expect, test } from "bun:test";
import { cleanSettings } from "./clean.ts";
import { createGame, startRound } from "./engine.ts";
import { MODES } from "./modes.ts";
import { actParty, botParty, createParty, startParty, timeoutParty } from "./party.ts";
import { DEFAULT_PARTY, MAX_PLAYERS, type PartyKind } from "./party-meta.ts";

const players = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `P${i}`, bot: true }));

test("tables seat up to 25", () => {
  expect(MAX_PLAYERS).toBe(25);
  const prev = cleanSettings(undefined, { kind: "wildcard", name: "t", mode: "classic", rules: MODES.classic.rules, partyRules: DEFAULT_PARTY, isPublic: true, maxPlayers: 6, theme: "classic" });
  expect(cleanSettings({ maxPlayers: 99 }, prev).maxPlayers).toBe(25);
  expect(cleanSettings({ maxPlayers: 25 }, prev).maxPlayers).toBe(25);
});

test("Wildcard deals 25 hands and still has a draw pile", () => {
  const s = createGame(MODES.classic.rules, players(25));
  startRound(s);
  expect(s.seats.every((p) => p.hand.length === s.rules.handSize)).toBe(true);
  expect(s.drawPile.length).toBeGreaterThan(20);
});

test("every party game plays to the end with 25 bots", () => {
  for (const kind of ["imposter", "village", "draw"] as PartyKind[]) {
    const s = createParty(kind, players(25), { ...DEFAULT_PARTY, rounds: 1, imposters: 3, style: "relay", teams: 4 });
    startParty(s, 0);
    let now = 0;
    for (let guard = 0; s.phase !== "over" && guard < 5000; guard++) {
      const b = botParty(s, now);
      if (b && b.at <= (s.ends ?? Infinity)) actParty(s, b.seat, b.action, (now = Math.max(now, b.at)));
      else timeoutParty(s, (now = s.ends ?? now));
    }
    expect([kind, s.phase]).toEqual([kind, "over"]);
  }
});
