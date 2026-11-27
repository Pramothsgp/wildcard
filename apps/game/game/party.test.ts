import { expect, test } from "bun:test";
import { cleanPartyAction, cleanSettings } from "./clean.ts";
import type { ImposterState } from "./imposter.ts";
import { MODES } from "./modes.ts";
import { actParty, botParty, createParty, startParty, timeoutParty, viewParty } from "./party.ts";
import { DEFAULT_PARTY, type ImposterView, type PartyOpts, type VillageView } from "./party-meta.ts";
import { tally } from "./party-core.ts";
import { type VillageState, dealRoles } from "./village.ts";
import { WORDS } from "./words.ts";

const players = (n: number, bot = false) => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `P${i}`, bot }));
const opts = (o: Partial<PartyOpts> = {}): PartyOpts => ({ ...DEFAULT_PARTY, laps: 1, rounds: 2, ...o });

function imposter(n = 4, o: Partial<PartyOpts> = {}) {
  const s = createParty("imposter", players(n), opts({ pack: "food", ...o })) as ImposterState;
  startParty(s, 0);
  s.imposters = [3];
  return s;
}
const iv = (s: ImposterState, id: string) => viewParty(s, id) as ImposterView;
const vv = (s: VillageState, id: string) => viewParty(s, id) as VillageView;
const count = (r: string[], x: string) => r.filter((y) => y === x).length;
const word = (s: ImposterState) => WORDS[s.pack][s.entry].word;
const clueRound = (s: ImposterState) => {
  for (let k = 0; k < s.players.length; k++) actParty(s, s.turn, { type: "clue", text: `hint${k}` }, 0);
};

test("tally: unique top wins, ties give nobody, null counts as skip", () => {
  expect(tally({ 0: 1, 1: 1, 2: 2 }).top).toBe(1);
  expect(tally({ 0: 1, 1: 2 }).top).toBe(null);
  expect(tally({ 0: null, 1: null, 2: 1 }).skips).toBe(2);
});

test("imposter: only the imposter is missing the word, and it's revealed at the end", () => {
  const s = imposter();
  expect(iv(s, "p0").word).toBe(word(s));
  expect(iv(s, "p3").word).toBe(null);
  expect(iv(s, "p3").youAreImposter).toBe(true);
  expect(iv(s, "p0").imposters).toBe(null);
});

test("imposter: clues go round in order, can't say the word, then voting opens", () => {
  const s = imposter();
  expect(() => actParty(s, (s.turn + 1) % 4, { type: "clue", text: "x" }, 0)).toThrow("Not your turn");
  expect(() => actParty(s, s.turn, { type: "clue", text: `my ${word(s).toLowerCase()}` }, 0)).toThrow("can't say the word");
  clueRound(s);
  expect(s.phase).toBe("vote");
  expect(s.clues.length).toBe(4);
});

test("imposter: crew catches the imposter who then guesses wrong", () => {
  const s = imposter();
  clueRound(s);
  for (let i = 0; i < 3; i++) actParty(s, i, { type: "vote", target: "p3" }, 0);
  actParty(s, 3, { type: "vote", target: "p0" }, 0);
  expect(s.phase).toBe("guess");
  expect(() => actParty(s, 0, { type: "guess", text: "x" }, 0)).toThrow();
  actParty(s, 3, { type: "guess", text: "definitely not it" }, 0);
  expect(s.phase).toBe("reveal");
  expect(s.players.map((p) => p.score)).toEqual([30, 30, 30, 0]);
  expect(iv(s, "p0").imposters).toEqual(["p3"]);
});

test("imposter: a right guess steals the round; a tie lets the imposter escape", () => {
  const s = imposter();
  clueRound(s);
  for (let i = 0; i < 4; i++) actParty(s, i, { type: "vote", target: i === 3 ? "p0" : "p3" }, 0);
  actParty(s, 3, { type: "guess", text: ` ${word(s).toUpperCase()}! ` }, 0);
  expect(s.players[3].score).toBe(20);

  const t = imposter();
  clueRound(t);
  for (const [i, v] of [[0, "p1"], [1, "p0"], [2, "p3"], [3, "p2"]] as const) actParty(t, i, { type: "vote", target: v }, 0);
  expect(t.phase).toBe("reveal");
  expect(t.players[3].score).toBe(30);
});

test("imposter: with 2 imposters everyone picks 2, and both must be accused", () => {
  const s = imposter(6);
  s.imposters = [4, 5];
  clueRound(s);
  actParty(s, 0, { type: "vote", target: "p4" }, 0);
  expect(iv(s, "p0").mine).toEqual(["p4"]);
  expect(iv(s, "p0").done).toEqual([]);
  actParty(s, 0, { type: "vote", target: "p1" }, 0);
  actParty(s, 0, { type: "vote", target: "p1" }, 0); // tapping again drops the pick
  actParty(s, 0, { type: "vote", target: "p5" }, 0);
  expect(iv(s, "p0").done).toEqual(["p0"]);
  for (const i of [1, 2, 3]) for (const t of ["p4", "p5"]) actParty(s, i, { type: "vote", target: t }, 0);
  for (const i of [4, 5]) for (const t of ["p0", "p1"]) actParty(s, i, { type: "vote", target: t }, 0);
  expect(s.phase).toBe("guess");
  expect(iv(s, "p0").accused).toEqual(["p4", "p5"]);
  expect(iv(s, "p5").turn).toBe("p5");
  actParty(s, 5, { type: "guess", text: "nope" }, 0);
  expect(s.players.map((p) => p.score)).toEqual([40, 40, 40, 40, 0, 0]);

  // Only one imposter accused: the imposters win, the caught one scores less.
  const t = imposter(6);
  t.imposters = [4, 5];
  clueRound(t);
  for (const i of [0, 1, 2, 3]) for (const v of ["p4", i === 0 ? "p5" : "p0"]) actParty(t, i, { type: "vote", target: v }, 0);
  for (const i of [4, 5]) for (const v of ["p0", "p1"]) actParty(t, i, { type: "vote", target: v }, 0);
  expect(t.phase).toBe("reveal");
  expect(iv(t, "p0").accused).toEqual(["p0", "p4"]);
  expect(t.players.map((p) => p.score)).toEqual([0, 0, 0, 0, 20, 30]);
});

test("imposter: timeouts skip a clue, and the match ends after the set rounds", () => {
  const s = imposter(3, { rounds: 1 });
  s.imposters = [2];
  timeoutParty(s, 0);
  expect(s.clues[0].text).toBe("(no clue)");
  timeoutParty(s, 0);
  timeoutParty(s, 0);
  expect(s.phase).toBe("vote");
  timeoutParty(s, 0);
  expect(s.phase).toBe("over");
  expect(s.champ).toBe(2);
});

test("imposter: an all-bot table plays itself to the end", () => {
  const s = createParty("imposter", players(7, true), opts({ rounds: 3, laps: 2, imposters: 2 }));
  startParty(s, 0);
  let now = 0;
  for (let guard = 0; s.phase !== "over" && guard < 500; guard++) {
    const b = botParty(s, now);
    if (b) actParty(s, b.seat, b.action, (now = Math.max(now, b.at)));
    else timeoutParty(s, (now = s.ends ?? now));
  }
  expect(s.phase).toBe("over");
});

test("imposter: up to 3 imposters on a 20-player table, fewer on small ones", () => {
  const big = createParty("imposter", players(20), opts({ imposters: 3 })) as ImposterState;
  startParty(big, 0);
  expect(big.imposters.length).toBe(3);
  const small = createParty("imposter", players(5), opts({ imposters: 3 })) as ImposterState;
  startParty(small, 0);
  expect(small.imposters.length).toBe(1);
});

test("20 bots play a whole match of each party game", () => {
  for (const kind of ["imposter", "village"] as const) {
    const s = createParty(kind, players(20, true), opts({ rounds: 1, imposters: 3 }));
    startParty(s, 0);
    let now = 0;
    for (let guard = 0; s.phase !== "over" && guard < 3000; guard++) {
      const b = botParty(s, now);
      if (b) actParty(s, b.seat, b.action, (now = Math.max(now, b.at)));
      else timeoutParty(s, (now = s.ends ?? now));
    }
    expect(s.phase).toBe("over");
  }
});

test("village: roles scale with the table", () => {
  expect(count(dealRoles(4), "wolf")).toBe(1);
  expect(count(dealRoles(4), "healer")).toBe(0);
  expect(count(dealRoles(5), "healer")).toBe(1);
  expect(count(dealRoles(7), "wolf")).toBe(2);
  expect(count(dealRoles(10), "seer")).toBe(1);
  expect(count(dealRoles(20), "wolf")).toBe(4);
  expect(dealRoles(20).length).toBe(20);
});

function village(roles: VillageState["roles"]) {
  const s = createParty("village", players(roles.length), opts({ rounds: 1 })) as VillageState;
  startParty(s, 0);
  s.roles = roles;
  return s;
}

test("village: wolves see each other; nobody else sees roles", () => {
  const s = village(["wolf", "wolf", "seer", "healer", "villager", "villager", "villager"]);
  expect(Object.keys(vv(s, "p0").known).toSorted()).toEqual(["p0", "p1"]);
  expect(Object.keys(vv(s, "p4").known)).toEqual(["p4"]);
  expect(vv(s, "p4").done).toEqual([]);
});

test("village: the healer saves the target; the seer learns a role", () => {
  const s = village(["wolf", "seer", "healer", "villager", "villager"]);
  actParty(s, 0, { type: "pick", target: "p3" }, 0);
  expect(() => actParty(s, 3, { type: "pick", target: "p0" }, 0)).toThrow("Nothing for you");
  actParty(s, 1, { type: "pick", target: "p0" }, 0);
  actParty(s, 2, { type: "pick", target: "p3" }, 0);
  expect(s.phase).toBe("day");
  expect(s.alive.every(Boolean)).toBe(true);
  expect(vv(s, "p1").seen).toEqual([{ id: "p0", wolf: true }]);
  expect(vv(s, "p3").seen).toEqual([]);
});

test("village: voting out the wolf wins it for the village", () => {
  const s = village(["wolf", "seer", "healer", "villager", "villager"]);
  actParty(s, 0, { type: "pick", target: "p4" }, 0);
  actParty(s, 1, { type: "pick", target: "p0" }, 0);
  actParty(s, 2, { type: "pick", target: "p2" }, 0);
  expect(s.alive[4]).toBe(false);
  expect(() => actParty(s, 4, { type: "vote", target: "p0" }, 0)).toThrow("out of this round");
  for (const i of [1, 2, 3]) actParty(s, i, { type: "vote", target: "p0" }, 0);
  actParty(s, 0, { type: "vote", target: null }, 0);
  expect(s.winner).toBe("village");
  expect(s.phase).toBe("over");
  expect(s.players.map((p) => p.score)).toEqual([0, 40, 40, 40, 30]);
});

test("village: wolves win when they equal the rest; skips can block an exile", () => {
  const s = village(["wolf", "seer", "villager", "villager"]);
  expect(() => actParty(s, 0, { type: "vote", target: null }, 0)).toThrow("Voting is by day");
  timeoutParty(s, 0); // no picks: quiet night
  actParty(s, 0, { type: "vote", target: "p2" }, 0);
  for (const i of [1, 2, 3]) actParty(s, i, { type: "vote", target: null }, 0);
  expect(s.alive.every(Boolean)).toBe(true);
  actParty(s, 0, { type: "pick", target: "p2" }, 0);
  actParty(s, 1, { type: "pick", target: "p3" }, 0);
  expect(s.phase).toBe("day");
  for (const i of [0, 1, 3]) actParty(s, i, { type: "vote", target: i === 1 ? "p0" : "p1" }, 0);
  expect(s.winner).toBe("wolves");
});

test("village: an all-bot table always finishes", () => {
  for (const n of [4, 6, 9]) {
    const s = createParty("village", players(n, true), opts({ rounds: 2 }));
    startParty(s, 0);
    let now = 0;
    for (let guard = 0; s.phase !== "over" && guard < 1000; guard++) {
      const b = botParty(s, now);
      if (b) actParty(s, b.seat, b.action, (now = Math.max(now, b.at)));
      else timeoutParty(s, (now = s.ends ?? now));
    }
    expect(s.phase).toBe("over");
  }
});

test("settings: old tables default to Wildcard; party options are clamped", () => {
  const prev = { name: "t", mode: "classic", rules: MODES.classic.rules, isPublic: true, maxPlayers: 6, theme: "classic" } as never;
  const s = cleanSettings({ partyRules: { rounds: 99, seconds: 1, pack: "nope", imposters: 5 } as never }, prev);
  expect(s.kind).toBe("wildcard");
  expect(s.partyRules).toEqual({ ...DEFAULT_PARTY, rounds: 10, seconds: 10, imposters: 3 });
  expect(cleanSettings({ kind: "village" }, prev).kind).toBe("village");
  expect(() => cleanPartyAction({ type: "vote", target: 5 })).toThrow();
  expect(cleanPartyAction({ type: "vote", target: null })).toEqual({ type: "vote", target: null });
});
