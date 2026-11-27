import { expect, test } from "bun:test";
import type { DrawState } from "./draw.ts";
import { actParty, botParty, createParty, startParty, timeoutParty, viewParty } from "./party.ts";
import { DEFAULT_PARTY, type DrawView, type PartyOpts, sanitizeParty } from "./party-meta.ts";
import { type Op, cleanCmd, cleanOp } from "./sketch-ops.ts";
import { apply, blankBoard, boardFor } from "./sketch-room.ts";

const players = (n: number, bot = false) => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `P${i}`, bot }));
const opts = (o: Partial<PartyOpts> = {}): PartyOpts => ({ ...DEFAULT_PARTY, rounds: 1, laps: 1, seconds: 10, ...o });
const dv = (s: DrawState, id: string) => viewParty(s, id) as DrawView;
const id = (s: DrawState, seat: number) => s.players[seat].id;

function game(n: number, o: Partial<PartyOpts> = {}) {
  const s = createParty("draw", players(n), opts(o)) as DrawState;
  startParty(s, 0);
  return s;
}

test("draw classic: drawer picks a word, only they see it, others guess for points", () => {
  const s = game(3);
  const drawer = s.drawers[0];
  const [a, b] = [0, 1, 2].filter((i) => i !== drawer);
  expect(dv(s, id(s, drawer)).choices?.length).toBe(3);
  expect(dv(s, id(s, a)).choices).toBe(null);
  expect(() => actParty(s, a, { type: "word", index: 0 }, 0)).toThrow("not your turn");
  actParty(s, drawer, { type: "word", index: 1 }, 0);
  expect(s.phase).toBe("draw");
  expect(dv(s, id(s, drawer)).word).toBe(s.word);
  expect(dv(s, id(s, a)).word).toBe(null);
  expect(dv(s, id(s, a)).hint.replace(/[^_]/g, "").length).toBeGreaterThan(0);
  expect(() => actParty(s, drawer, { type: "guess", text: s.word }, 0)).toThrow();

  actParty(s, a, { type: "guess", text: "definitely wrong" }, 0);
  actParty(s, a, { type: "guess", text: ` ${s.word.toUpperCase()}!` }, 0);
  expect(dv(s, id(s, a)).word).toBe(s.word); // solvers see the word
  expect(() => actParty(s, a, { type: "guess", text: "again" }, 0)).toThrow();
  actParty(s, b, { type: "guess", text: s.word }, 15_000);
  // Everyone guessed: the turn ends (each of the 3 players draws once a round). Faster scores more; drawer +10 per solver.
  expect(s.phase).toBe("reveal");
  expect(s.players[a].score).toBe(Math.round(100 * { easy: 0.8, medium: 1, hard: 1.3 }[s.level]));
  expect(s.players[b].score).toBeLessThan(100);
  expect(s.players[drawer].score).toBe(20);
});

test("draw classic: close guesses are flagged for the guesser only, and hints grow each step", () => {
  const s = game(3);
  const drawer = s.drawers[0];
  const [a, b] = [0, 1, 2].filter((i) => i !== drawer);
  actParty(s, drawer, { type: "word", index: 0 }, 0);
  s.word = "Elephant";
  s.reveal = [0, 1, 2, 3, 4, 5, 6, 7];
  actParty(s, a, { type: "guess", text: "elephnat" }, 0);
  expect(dv(s, id(s, a)).guesses[0].close).toBe(true);
  expect(dv(s, id(s, b)).guesses[0].close).toBe(false);
  expect(dv(s, id(s, a)).hint).toBe("________");
  timeoutParty(s, 10_000);
  expect(dv(s, id(s, a)).hint).toBe("E_______");
  timeoutParty(s, 20_000);
  timeoutParty(s, 30_000); // three steps of time, nobody got it
  expect(s.phase).toBe("reveal");
  expect(s.players.every((p) => p.score === 0)).toBe(true);
});

test("draw: each pick offers an easy, a medium and a hard word, none repeated in a match", () => {
  const s = game(3);
  expect(s.choices.map((c) => c.level).toSorted()).toEqual(["easy", "hard", "medium"]);
  const seen = new Set<string>();
  for (let k = 0; k < 3; k++) {
    for (const c of s.choices) expect(seen.has(c.word)).toBe(false);
    timeoutParty(s, 0); // picks one at random
    seen.add(s.word);
    while (s.phase === "draw") timeoutParty(s, 0);
    if (s.phase === "reveal") startParty(s, 0);
  }
  const themed = game(3, { pack: "animals" });
  expect(themed.choices.every((c) => c.category === "Animals")).toBe(true);
});

test("draw relay: one guesser per team; everyone else sees the word; the pen passes in turns", () => {
  const s = game(6, { style: "relay", teams: 2 });
  expect(s.teamCount).toBe(2);
  const guesser = s.guessers[0];
  expect(s.guessers.length).toBe(1);
  const team = s.team[guesser];
  expect(s.drawers.every((d) => s.team[d] === team && d !== guesser)).toBe(true);
  expect(s.slots).toBe(2);
  actParty(s, s.drawers[0], { type: "word", index: 0 }, 0);
  const other = s.players.findIndex((_, i) => s.team[i] !== team);
  expect(dv(s, id(s, guesser)).word).toBe(null);
  expect(dv(s, id(s, other)).word).toBe(s.word); // the other team sees it too
  expect(dv(s, id(s, other)).canGuess).toBe(false);
  expect(() => actParty(s, other, { type: "guess", text: s.word }, 0)).toThrow("Only this turn's guessers");

  const first = dv(s, id(s, guesser)).drawer;
  expect(() => actParty(s, s.drawers[1], { type: "pass" }, 0)).toThrow("not your turn to draw");
  actParty(s, s.drawers[0], { type: "pass" }, 1000);
  expect(dv(s, id(s, guesser)).drawer).not.toBe(first);
  expect(s.word).toBe(s.used[0]); // same word, no new pick

  actParty(s, guesser, { type: "guess", text: s.word }, 1000);
  expect(s.phase).toBe("reveal");
  for (let i = 0; i < 6; i++) expect(s.players[i].score > 0).toBe(s.team[i] === team);
});

test("draw relay: teams take turns, the guesser rotates, and small tables get fewer teams", () => {
  const s = game(4, { style: "relay", teams: 4, rounds: 2 });
  expect(s.teamCount).toBe(2);
  const seen: number[] = [];
  for (let k = 0; k < 4; k++) {
    seen.push(s.guessers[0]);
    timeoutParty(s, 0); // pick
    while (s.phase === "draw") timeoutParty(s, 0);
    if (s.phase === "reveal") startParty(s, 0);
  }
  expect(s.phase).toBe("over");
  expect(new Set(seen).size).toBe(4); // two turns per team, a different guesser each time
});

test("draw: an all-bot table plays itself to the end in both styles", () => {
  for (const o of [{ style: "classic" }, { style: "relay" }, { style: "relay", showWord: false, steal: true, guessers: 2 }] as Partial<PartyOpts>[]) {
    const s = createParty("draw", players(6, true), opts({ ...o, rounds: 2 })) as DrawState;
    startParty(s, 0);
    let now = 0;
    for (let guard = 0; s.phase !== "over" && guard < 2000; guard++) {
      const b = botParty(s, now);
      if (b && b.at <= (s.ends ?? Infinity)) actParty(s, b.seat, b.action, (now = Math.max(now, b.at)));
      else timeoutParty(s, (now = s.ends ?? now));
    }
    expect(s.phase).toBe("over");
  }
});

test("draw options: style and teams are clamped", () => {
  expect(sanitizeParty({ style: "nope", teams: 9 }).teams).toBe(4);
  expect(sanitizeParty({ style: "nope" }).style).toBe("classic");
  expect(sanitizeParty({ style: "relay" }).style).toBe("relay");
});

test("sketch: steps from clients are checked and clamped", () => {
  expect(cleanOp({ k: "stroke", tool: "pen", c: "#FF0000", s: 500, p: [-5, 2000, 10, 10] })).toEqual({ k: "stroke", tool: "pen", c: "#ff0000", s: 80, p: [0, 750, 10, 10] });
  expect(cleanOp({ k: "stroke", tool: "pen", c: "red", s: 4, p: [1, 2] })).toBe(null);
  expect(cleanOp({ k: "stroke", tool: "pen", c: "#000000", s: 4, p: [1, 2, 3] })).toBe(null);
  expect(cleanOp({ k: "fill", c: "#000000", p: [1, 2, 3, 4] })).toBe(null);
  expect(cleanOp({ k: "shape", shape: "rect", c: "#000000", s: 4, p: [0, 0, 5, 5], solid: "yes" })).toEqual({ k: "shape", shape: "rect", c: "#000000", s: 4, solid: false, p: [0, 0, 5, 5] });
  expect(cleanCmd({ k: "op", op: { k: "nope" } })).toBe(null);
  expect(cleanCmd({ k: "undo" })).toEqual({ k: "undo" });
});

test("sketch: the board keeps steps, undo and redo move them, a new word wipes it", () => {
  const b = blankBoard(1);
  const op: Op = { k: "fill", c: "#000000", p: [1, 1] };
  expect(apply(b, { k: "op", op }).others).toBeDefined();
  apply(b, { k: "op", op: { k: "clear" } });
  apply(b, { k: "undo" });
  expect(b.ops).toEqual([op]);
  apply(b, { k: "redo" });
  expect(b.ops.length).toBe(2);
  apply(b, { k: "undo" });
  apply(b, { k: "op", op });
  expect(b.redo).toEqual([]); // a new step drops what could be redone
  expect(boardFor(b, 2).ops).toEqual([]);
});

test("draw relay: the host can pick the teams; anyone unpicked joins the smallest team", () => {
  const picks = { p0: 1, p1: 1, p2: 1, p3: 0 };
  const s = createParty("draw", players(6), opts({ style: "relay", teams: 2, teamPick: "manual", teamOf: picks })) as DrawState;
  expect(s.team.slice(0, 4)).toEqual([1, 1, 1, 0]);
  expect(s.team.slice(4)).toEqual([0, 0]); // p4 and p5 fill the smaller team
  expect(() => createParty("draw", players(4), opts({ style: "relay", teams: 2, teamPick: "manual", teamOf: { p0: 0, p1: 0, p2: 0, p3: 0 } }))).toThrow("Team Blue needs at least 2 players");
});

test("draw relay: guessers and drawers per turn are set by the host; the rest sit out and can't see the word", () => {
  const s = game(10, { style: "relay", teams: 2, guessers: 2, drawers: 2 });
  const team = s.team[s.guessers[0]];
  expect(s.guessers.length).toBe(2);
  expect(s.drawers.length).toBe(2);
  actParty(s, s.drawers[0], { type: "word", index: 0 }, 0);
  const out = s.players.findIndex((_, i) => s.team[i] === team && !s.guessers.includes(i) && !s.drawers.includes(i));
  expect(dv(s, id(s, out)).word).toBe(null);
  expect(dv(s, id(s, out)).canGuess).toBe(false);
  expect(dv(s, id(s, s.drawers[1])).word).toBe(s.word);
  // Either guesser can get it.
  actParty(s, s.guessers[1], { type: "guess", text: s.word }, 0);
  expect(s.phase).toBe("reveal");
});

test("draw relay: other teams can be kept from seeing the word, and can then steal a missed one", () => {
  const s = game(4, { style: "relay", teams: 2, showWord: false, steal: true, laps: 1 });
  const team = s.team[s.guessers[0]];
  const other = s.players.findIndex((_, i) => s.team[i] !== team);
  timeoutParty(s, 0); // word picked
  expect(dv(s, id(s, other)).word).toBe(null);
  expect(() => actParty(s, other, { type: "guess", text: s.word }, 0)).toThrow();
  timeoutParty(s, 0);
  timeoutParty(s, 0); // both drawing turns run out
  expect(s.phase).toBe("steal");
  expect(s.ends).toBe(0 + 20_000); // the steal time is its own setting (default 20s)
  expect(dv(s, id(s, other)).canGuess).toBe(true);
  expect(dv(s, id(s, s.guessers[0])).canGuess).toBe(false);
  actParty(s, other, { type: "guess", text: s.word }, 0);
  expect(s.phase).toBe("reveal");
  for (let i = 0; i < 4; i++) expect(s.players[i].score > 0).toBe(s.team[i] !== team);

  // With the word shown to other teams there is no steal, even if it was switched on.
  const t = game(4, { style: "relay", teams: 2, showWord: true, steal: true, laps: 1 });
  timeoutParty(t, 0);
  timeoutParty(t, 0);
  timeoutParty(t, 0);
  expect(t.phase).toBe("reveal");
});

test("lobby changes merge on the server, so quick picks don't overwrite each other", () => {
  const first = sanitizeParty({ teamOf: { p0: 1 } }, DEFAULT_PARTY);
  const second = sanitizeParty({ teamOf: { p1: 0 } }, first); // sent before the first came back
  expect(second.teamOf).toEqual({ p0: 1, p1: 0 });
  expect(sanitizeParty({ teamOf: { p0: -1 } }, second).teamOf).toEqual({ p1: 0 }); // back to auto
  expect(sanitizeParty({ teamOf: { p2: 7, ["x".repeat(99)]: 1 } }, second).teamOf).toEqual({ p0: 1, p1: 0 }); // bad picks ignored
  const steal = sanitizeParty({ steal: true }, { ...DEFAULT_PARTY, guessers: 3 });
  expect([steal.steal, steal.guessers]).toEqual([true, 3]); // other options untouched
});
