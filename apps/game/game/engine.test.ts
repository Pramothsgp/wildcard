import { expect, test } from "bun:test";
import type { Card, Face } from "./cards.ts";
import { type GameState, act, botAction, canPlay, createGame, startRound } from "./engine.ts";
import { ordinal } from "./help.ts";
import { MODES, sanitizeRules } from "./modes.ts";

const players = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `P${i}`, bot: false }));
let nextId = 10_000;
const card = (color: Face["color"], value: Face["value"]): Card => ({ id: nextId++, light: { color, value } });

function game(mode: keyof typeof MODES = "classic", n = 3): GameState {
  const s = createGame(MODES[mode].rules, players(n));
  startRound(s);
  s.turn = 0;
  return s;
}

/** Put a known top card and hands in place. */
function rig(s: GameState, top: Card, hands: Card[][]) {
  s.discard = [top];
  s.color = top.light.color as GameState["color"];
  hands.forEach((h, i) => (s.seats[i].hand = h));
}

test("deck sizes", () => {
  for (const [mode, size] of [["classic", 108], ["flip", 116], ["ruthless", 168]] as const) {
    const s = game(mode, 2);
    const total = s.drawPile.length + s.discard.length + s.seats.reduce((t, p) => t + p.hand.length, 0);
    expect(total).toBe(size);
  }
});

test("matching colour or value is playable, others are not", () => {
  const s = game();
  rig(s, card("red", "5"), [[card("red", "2"), card("blue", "5"), card("green", "7"), card("wild", "wild")]]);
  const [a, b, c, d] = s.seats[0].hand;
  expect([canPlay(s, a), canPlay(s, b), canPlay(s, c), canPlay(s, d)]).toEqual([true, true, false, true]);
});

test("cannot play out of turn or an illegal card", () => {
  const s = game();
  rig(s, card("red", "5"), [[card("green", "7"), card("red", "1")], [card("red", "2")]]);
  expect(() => act(s, 1, { type: "play", cardId: s.seats[1].hand[0].id })).toThrow("Not your turn");
  expect(() => act(s, 0, { type: "play", cardId: s.seats[0].hand[0].id })).toThrow("can't be played");
});

test("skip and reverse move the turn correctly", () => {
  const s = game("classic", 4);
  rig(s, card("red", "5"), [[card("red", "skip"), card("red", "1")], [card("red", "1"), card("red", "1")], [card("red", "reverse"), card("red", "1")], [card("red", "1"), card("red", "1")]]);
  act(s, 0, { type: "play", cardId: s.seats[0].hand[0].id });
  expect(s.turn).toBe(2);
  act(s, 2, { type: "play", cardId: s.seats[2].hand[0].id });
  expect(s.direction).toBe(-1);
  expect(s.turn).toBe(1);
});

test("draw two hits the next player and skips them in classic", () => {
  const s = game();
  rig(s, card("red", "5"), [[card("red", "draw2"), card("blue", "1")], [card("blue", "2")], [card("blue", "3")]]);
  act(s, 0, { type: "play", cardId: s.seats[0].hand[0].id });
  expect(s.seats[1].hand.length).toBe(3);
  expect(s.turn).toBe(2);
});

test("stacking passes the draw along", () => {
  const s = game("stack");
  rig(s, card("red", "5"), [[card("red", "draw2"), card("blue", "1")], [card("green", "draw2"), card("blue", "2")], [card("blue", "3")]]);
  act(s, 0, { type: "play", cardId: s.seats[0].hand[0].id });
  expect(s.turn).toBe(1);
  expect(s.pendingDraw).toBe(2);
  act(s, 1, { type: "play", cardId: s.seats[1].hand[0].id });
  // Seat 2 has nothing to stack, so they take 4 straight away.
  expect(s.seats[2].hand.length).toBe(5);
  expect(s.pendingDraw).toBe(0);
  expect(s.turn).toBe(0);
});

test("wild draw 4 challenge: guilty player draws 4, challenger keeps turn", () => {
  const s = game();
  rig(s, card("red", "5"), [[card("wild", "wild4"), card("red", "1"), card("blue", "1")], [card("blue", "2")], [card("blue", "3")]]);
  act(s, 0, { type: "play", cardId: s.seats[0].hand[0].id, color: "green" });
  expect(s.turn).toBe(1);
  act(s, 1, { type: "challenge" });
  expect(s.seats[0].hand.length).toBe(6);
  expect(s.seats[1].hand.length).toBe(1);
  expect(s.turn).toBe(1);
});

test("wild needs a colour", () => {
  const s = game();
  rig(s, card("red", "5"), [[card("wild", "wild"), card("red", "1")]]);
  expect(() => act(s, 0, { type: "play", cardId: s.seats[0].hand[0].id })).toThrow("Pick a colour");
});

test("forgetting to call can be caught, calling protects you", () => {
  const s = game();
  rig(s, card("red", "5"), [[card("red", "1"), card("red", "2")], [card("blue", "2"), card("blue", "3")], [card("blue", "4")]]);
  act(s, 0, { type: "play", cardId: s.seats[0].hand[0].id });
  expect(s.unoTarget).toBe(0);
  act(s, 2, { type: "catch", target: "p0" });
  expect(s.seats[0].hand.length).toBe(3);

  const t = game();
  rig(t, card("red", "5"), [[card("red", "1"), card("red", "2")], [card("blue", "2")], [card("blue", "4")]]);
  act(t, 0, { type: "uno" });
  act(t, 0, { type: "play", cardId: t.seats[0].hand[0].id });
  expect(t.unoTarget).toBe(null);
  expect(() => act(t, 2, { type: "catch", target: "p0" })).toThrow();
});

test("going out scores the other hands and ends the round", () => {
  const s = game();
  rig(s, card("red", "5"), [[card("red", "1")], [card("blue", "9"), card("wild", "wild")], [card("green", "skip")]]);
  act(s, 0, { type: "uno" });
  act(s, 0, { type: "play", cardId: s.seats[0].hand[0].id });
  expect(s.phase).toBe("roundOver");
  expect(s.seats[0].score).toBe(9 + 50 + 20);
});

test("single-round mode ends the match", () => {
  const s = game("speed", 2);
  rig(s, card("red", "5"), [[card("red", "1")], [card("blue", "9")]]);
  act(s, 0, { type: "play", cardId: s.seats[0].hand[0].id });
  expect(s.phase).toBe("matchOver");
});

test("seven swaps hands with the chosen player", () => {
  const s = game("sevenZero");
  const mine = [card("red", "7"), card("red", "1")];
  const theirs = [card("blue", "1"), card("blue", "2"), card("blue", "3")];
  rig(s, card("red", "5"), [mine, [card("green", "1")], theirs]);
  act(s, 0, { type: "play", cardId: mine[0].id, target: "p2" });
  expect(s.seats[0].hand.map((c) => c.id)).toEqual(theirs.map((c) => c.id));
  expect(s.seats[2].hand.map((c) => c.id)).toEqual([mine[1].id]);
});

test("jump-in lets an identical card cut the queue", () => {
  const s = game("jumpIn");
  const top = card("red", "5");
  rig(s, top, [[card("blue", "1")], [card("blue", "2")], [card("red", "5"), card("green", "1")]]);
  act(s, 2, { type: "play", cardId: s.seats[2].hand[0].id });
  expect(s.turn).toBe(0);
});

test("mercy rule knocks out at 25 cards", () => {
  const s = game("ruthless", 3);
  rig(s, card("red", "5"), [[card("green", "1")], Array.from({ length: 24 }, () => card("blue", "1")), [card("blue", "4")]]);
  s.turn = 1;
  s.rules = { ...s.rules, drawToMatch: false };
  act(s, 1, { type: "draw" });
  expect(s.seats[1].out).toBe(true);
  expect(s.turn).toBe(2);
});

test("flip turns the table to the dark side", () => {
  const s = game("flip", 2);
  const flip: Card = { id: nextId++, light: { color: "red", value: "flip" }, dark: { color: "teal", value: "3" } };
  const top: Card = { id: nextId++, light: { color: "red", value: "5" }, dark: { color: "pink", value: "2" } };
  rig(s, top, [[flip, card("red", "1")], [card("blue", "1")]]);
  act(s, 0, { type: "play", cardId: flip.id });
  expect(s.side).toBe("dark");
  expect(s.color).toBe("teal");
});

test("bots can always finish a game", () => {
  for (const mode of Object.keys(MODES) as (keyof typeof MODES)[]) {
    const s = createGame({ ...MODES[mode].rules, targetScore: 0 }, players(4).map((p) => ({ ...p, bot: true })));
    startRound(s);
    let steps = 0;
    while (s.phase === "playing" && steps++ < 5000) act(s, s.turn, botAction(s, s.turn, true));
    expect(s.phase).toBe("matchOver");
  }
});

test("rule overrides from clients are clamped", () => {
  const r = sanitizeRules("classic", { handSize: 99, turnSeconds: -5, stacking: "yes", jumpIn: true });
  expect(r.handSize).toBe(12);
  expect(r.turnSeconds).toBe(5);
  expect(r.stacking).toBe(false);
  expect(r.jumpIn).toBe(true);
});

test("draws say why they happened", () => {
  const s = game();
  s.rules = { ...s.rules, drawToMatch: true };
  rig(s, card("red", "5"), [[card("green", "7")], [card("blue", "2")], [card("blue", "3")]]);
  s.drawPile = [card("blue", "1"), card("green", "1"), card("red", "9")];
  const ev = act(s, 0, { type: "draw" });
  expect(ev[0].text).toBe("P0 drew 3 (until playable)");
  expect(s.drawn).not.toBe(null);
});

test("play on: first out wins the round, the rest play for places", () => {
  const s = game("classic", 3);
  s.rules = { ...s.rules, playOn: true };
  rig(s, card("red", "5"), [[card("red", "1")], [card("red", "2"), card("blue", "9")], [card("red", "3"), card("green", "4")]]);
  act(s, 0, { type: "play", cardId: s.seats[0].hand[0].id });
  expect(s.phase).toBe("playing");
  expect(s.roundWinner).toBe(0);
  expect(s.seats[0].score).toBe(2 + 9 + 3 + 4);
  expect(s.seats[0].place).toBe(1);
  expect(s.turn).toBe(1);
  act(s, 1, { type: "play", cardId: s.seats[1].hand[0].id });
  // P2 is next; P0 is skipped from now on.
  expect(s.turn).toBe(2);
  s.seats[1].hand = [card("red", "6")];
  act(s, 2, { type: "draw" });
  if (s.drawn !== null) act(s, 2, { type: "pass" });
  expect(s.turn).toBe(1);
  act(s, 1, { type: "play", cardId: s.seats[1].hand[0].id });
  expect(s.phase).not.toBe("playing");
  expect(s.seats.map((p) => p.place)).toEqual([1, 2, 3]);
  expect(s.seats[0].score).toBe(18);
});

test("play on with bots always finishes", () => {
  for (const mode of Object.keys(MODES) as (keyof typeof MODES)[]) {
    const s = createGame({ ...MODES[mode].rules, targetScore: 0, playOn: true }, players(5).map((p) => ({ ...p, bot: true })));
    startRound(s);
    let steps = 0;
    while (s.phase === "playing" && steps++ < 20000) act(s, s.turn, botAction(s, s.turn, true));
    expect(s.phase).toBe("matchOver");
  }
});

test("ordinals", () => {
  expect([1, 2, 3, 4, 11, 12, 13, 21, 22].map(ordinal)).toEqual(["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd"]);
});
