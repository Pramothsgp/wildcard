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
  expect(s.players[a].score).toBe(100);
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

test("draw relay: one guesser per team; everyone else sees the word; the pen passes in turns", () => {
  const s = game(6, { style: "relay", teams: 2 });
  expect(s.teamCount).toBe(2);
  const guesser = s.guesser!;
  const team = s.team[guesser];
  expect(s.drawers.every((d) => s.team[d] === team && d !== guesser)).toBe(true);
  expect(s.slots).toBe(2);
  actParty(s, s.drawers[0], { type: "word", index: 0 }, 0);
  const other = s.players.findIndex((_, i) => s.team[i] !== team);
  expect(dv(s, id(s, guesser)).word).toBe(null);
  expect(dv(s, id(s, other)).word).toBe(s.word); // the other team sees it too
  expect(dv(s, id(s, other)).canGuess).toBe(false);
  expect(() => actParty(s, other, { type: "guess", text: s.word }, 0)).toThrow("Only the guesser");

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
    seen.push(s.guesser!);
    timeoutParty(s, 0); // pick
    while (s.phase === "draw") timeoutParty(s, 0);
    if (s.phase === "reveal") startParty(s, 0);
  }
  expect(s.phase).toBe("over");
  expect(new Set(seen).size).toBe(4); // two turns per team, a different guesser each time
});

test("draw: an all-bot table plays itself to the end in both styles", () => {
  for (const style of ["classic", "relay"] as const) {
    const s = createParty("draw", players(6, true), opts({ style, rounds: 2 })) as DrawState;
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
