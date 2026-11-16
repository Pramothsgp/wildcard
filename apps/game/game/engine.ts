// Pure game rules. All state is plain JSON so it can be saved to Postgres as-is.
import { randomInt } from "node:crypto";
import {
  type Card, type Color, type Side, DARK_COLORS, LIGHT_COLORS,
  buildDeck, describe, drawAmount, face, isWild, points,
} from "./cards.ts";
import { ACHIEVEMENTS, type AchievementId, ordinal } from "./help.ts";
import type { Rules } from "./modes.ts";
import type { Action } from "./protocol.ts";

export type Seat = {
  id: string;
  name: string;
  bot: boolean;
  /** Left the match or timed out: the server plays for them until they come back. */
  auto: boolean;
  hand: Card[];
  score: number;
  calledUno: boolean;
  /** Knocked out, or finished when playing on. */
  out: boolean;
  /** Finishing position when playing on; null until they go out. */
  place?: number | null;
  /** Most cards held this round, and whether they drew any (for achievements). */
  peak?: number;
  drew?: boolean;
};

export type GameState = {
  rules: Rules;
  phase: "playing" | "roundOver" | "matchOver";
  round: number;
  seats: Seat[];
  drawPile: Card[];
  discard: Card[];
  side: Side;
  color: Color;
  direction: 1 | -1;
  turn: number;
  /** Cards the current player must draw unless they stack or challenge. */
  pendingDraw: number;
  challenge: { by: number; prevColor: Color } | null;
  /** Card the current player just drew and may still play. */
  drawn: number | null;
  /** Seat that went down to one card without calling it, until the next player acts. */
  unoTarget: number | null;
  roundWinner: number | null;
  lastRoundPoints: number;
};

export type GameEvent = { kind: string; seat?: number; text: string; data?: Record<string, unknown> };

export class GameError extends Error {}
const fail = (msg: string): never => { throw new GameError(msg); };

export function shuffle<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const palette = (s: { side: Side }) => (s.side === "dark" ? DARK_COLORS : LIGHT_COLORS) as readonly Color[];
export const topCard = (s: GameState) => s.discard[s.discard.length - 1];
export const topFace = (s: GameState) => face(topCard(s), s.side);
const active = (s: GameState) => s.seats.filter((p) => !p.out);

export function createGame(rules: Rules, players: { id: string; name: string; bot: boolean }[]): GameState {
  return {
    rules, phase: "roundOver", round: 0,
    seats: players.map((p) => ({ ...p, auto: false, hand: [], score: 0, calledUno: false, out: false, place: null })),
    drawPile: [], discard: [], side: "light", color: "red", direction: 1, turn: 0,
    pendingDraw: 0, challenge: null, drawn: null, unoTarget: null, roundWinner: null, lastRoundPoints: 0,
  };
}

/** Deal a fresh round. The dealer rotates, so the first player does too. */
export function startRound(s: GameState): GameEvent[] {
  if (s.phase === "playing") fail("Round already in progress");
  if (s.phase === "matchOver") for (const p of s.seats) p.score = 0;
  s.round += 1;
  s.drawPile = shuffle(buildDeck(s.rules.deck, shuffle));
  s.discard = [];
  s.side = "light";
  s.direction = 1;
  Object.assign(s, { pendingDraw: 0, challenge: null, drawn: null, unoTarget: null, roundWinner: null, phase: "playing" });
  for (const p of s.seats) Object.assign(p, { hand: s.drawPile.splice(0, s.rules.handSize), calledUno: false, out: false, place: null, peak: s.rules.handSize, drew: false });
  // Start on a number card so nobody gets hit before the first turn.
  let first = s.drawPile.findIndex((c) => /^\d$/.test(c.light.value));
  if (first < 0) first = 0;
  s.discard.push(...s.drawPile.splice(first, 1));
  s.color = topFace(s).color as Color;
  s.turn = (s.round - 1) % s.seats.length;
  return [{ kind: "round", text: `Round ${s.round} dealt. ${describe(topFace(s))} starts the pile.`, data: { round: s.round } }];
}

export function nextSeat(s: GameState, from: number, steps = 1): number {
  let i = from;
  for (let k = 0; k < steps; k++) {
    do i = (i + s.direction + s.seats.length) % s.seats.length;
    while (s.seats[i].out && i !== from);
  }
  return i;
}

function refill(s: GameState) {
  const top = s.discard.pop()!;
  s.drawPile = shuffle(s.discard);
  s.discard = [top];
}

/** `why` goes into the log so nobody wonders where a pile of cards came from. */
function draw(s: GameState, seat: number, n: number, ev: GameEvent[], why: string, until?: (c: Card) => boolean): Card[] {
  const p = s.seats[seat];
  const got: Card[] = [];
  for (let i = 0; until ? true : i < n; i++) {
    if (!s.drawPile.length) refill(s);
    const card = s.drawPile.shift();
    if (!card) break;
    got.push(card);
    if (until?.(card)) break;
  }
  p.hand.push(...got);
  p.peak = Math.max(p.peak ?? 0, p.hand.length);
  if (got.length) p.drew = true;
  p.calledUno = false;
  if (s.unoTarget === seat) s.unoTarget = null;
  ev.push({ kind: "draw", seat, text: `${p.name} drew ${got.length}${why ? ` (${why})` : ""}`, data: { cards: got.map((c) => c.id) } });
  if (s.rules.mercy && p.hand.length >= 25 && !p.out) {
    p.out = true;
    s.drawPile.push(...p.hand.splice(0));
    ev.push({ kind: "knockout", seat, text: `${p.name} hit 25 cards and is knocked out` });
    if (active(s).length === 1) {
      // Playing on, the round already has a winner; otherwise the last one standing wins it.
      if (s.roundWinner !== null) closeRound(s, ev);
      else endRound(s, s.seats.indexOf(active(s)[0]), ev);
    }
  }
  return got;
}

export function canPlay(s: GameState, card: Card): boolean {
  const f = face(card, s.side);
  const top = topFace(s);
  if (s.pendingDraw > 0) return s.rules.stacking && drawAmount(f) >= Math.max(1, drawAmount(top));
  return isWild(f) || f.color === s.color || f.value === top.value;
}

export function act(s: GameState, seat: number, a: Action): GameEvent[] {
  const ev = apply(s, seat, a);
  // A knock-out can land on whoever holds the turn; move it on.
  if (s.phase === "playing" && s.seats[s.turn].out) {
    s.drawn = null;
    s.turn = nextSeat(s, s.turn);
  }
  return ev;
}

function apply(s: GameState, seat: number, a: Action): GameEvent[] {
  if (s.phase !== "playing") fail("The round is over");
  const me = s.seats[seat];
  if (!me || me.out) fail("You are not in this round");
  const ev: GameEvent[] = [];
  if (a.type !== "uno" && a.type !== "catch" && s.unoTarget !== null && s.unoTarget !== seat) s.unoTarget = null;

  switch (a.type) {
    case "uno": {
      if (me.hand.length > 2) fail("You can only call with two cards or fewer");
      me.calledUno = true;
      if (s.unoTarget === seat) s.unoTarget = null;
      ev.push({ kind: "uno", seat, text: `${me.name} calls WILDCARD!` });
      return ev;
    }
    case "catch": {
      const t = s.seats.findIndex((p) => p.id === a.target);
      if (t < 0 || t !== s.unoTarget || t === seat) fail("Nobody to catch");
      ev.push({ kind: "catch", seat, text: `${me.name} caught ${s.seats[t].name} not calling. +2` });
      draw(s, t, 2, ev, "caught not calling");
      return ev;
    }
  }

  if (a.type === "play") return play(s, seat, a, ev);
  if (s.turn !== seat) fail("Not your turn");

  if (a.type === "challenge") {
    const c = s.challenge ?? fail("Nothing to challenge");
    const offender = s.seats[c.by];
    const guilty = offender.hand.some((card) => face(card, s.side).color === c.prevColor);
    s.challenge = null;
    if (guilty) {
      ev.push({ kind: "challenge", seat, text: `${me.name} challenged and won. ${offender.name} draws 4` });
      s.pendingDraw = 0;
      draw(s, c.by, 4, ev, "lost the challenge");
      return ev; // challenger keeps the turn
    }
    ev.push({ kind: "challenge", seat, text: `${me.name} challenged and lost. Draws 6` });
    s.pendingDraw = 0;
    draw(s, seat, 6, ev, "challenge failed");
    endTurn(s, seat);
    return ev;
  }

  if (a.type === "pass") {
    if (s.drawn === null) fail("Draw a card first");
    ev.push({ kind: "pass", seat, text: `${me.name} passed` });
    endTurn(s, seat);
    return ev;
  }

  // draw
  if (s.pendingDraw > 0) {
    const n = s.pendingDraw;
    s.pendingDraw = 0;
    s.challenge = null;
    draw(s, seat, n, ev, `took +${n}`);
    endTurn(s, seat);
    return ev;
  }
  if (s.drawn !== null) fail("You already drew. Play it or pass");
  const got = s.rules.drawToMatch ? draw(s, seat, 0, ev, "until playable", (c) => canPlay(s, c)) : draw(s, seat, 1, ev, "");
  const last = got[got.length - 1];
  if (!me.out && last && canPlay(s, last)) s.drawn = last.id;
  else endTurn(s, seat);
  return ev;
}

function play(s: GameState, seat: number, a: Extract<Action, { type: "play" }>, ev: GameEvent[]): GameEvent[] {
  const me = s.seats[seat];
  const card = me.hand.find((c) => c.id === a.cardId) ?? fail("You don't have that card");
  const f = face(card, s.side);
  if (s.turn !== seat) {
    const top = topFace(s);
    const identical = !isWild(f) && f.color === top.color && f.value === top.value;
    if (!s.rules.jumpIn || !identical || s.pendingDraw > 0) fail("Not your turn");
    ev.push({ kind: "jumpIn", seat, text: `${me.name} jumped in!` });
    s.turn = seat;
    s.drawn = null;
  }
  if (s.drawn !== null && s.drawn !== card.id) fail("You can only play the card you drew");
  if (!canPlay(s, card)) fail("That card can't be played now");
  if (isWild(f) && (!a.color || !palette(s).includes(a.color))) fail("Pick a colour");
  let target = -1;
  if (s.rules.sevenZero && f.value === "7") {
    target = s.seats.findIndex((p, i) => p.id === a.target && i !== seat && !p.out);
    if (target < 0) {
      const others = s.seats.map((_, i) => i).filter((i) => i !== seat && !s.seats[i].out);
      target = others.length === 1 ? others[0] : fail("Pick who to swap with");
    }
  }

  const prevColor = s.color;
  me.hand = me.hand.filter((c) => c !== card);
  s.discard.push(card);
  s.color = isWild(f) ? a.color! : (f.color as Color);
  s.drawn = null;
  s.challenge = null;
  ev.push({ kind: "play", seat, text: `${me.name} played ${describe(f)}${isWild(f) ? ` → ${s.color}` : ""}`, data: { card: card.id, color: s.color } });

  if (f.value === "discardAll") {
    const same = me.hand.filter((c) => face(c, s.side).color === f.color);
    me.hand = me.hand.filter((c) => !same.includes(c));
    s.discard.splice(s.discard.length - 1, 0, ...same);
    if (same.length) ev.push({ kind: "discardAll", seat, text: `${me.name} dumped ${same.length} more ${f.color}`, data: { cards: same.map((c) => c.id) } });
  }

  let next = nextSeat(s, seat);
  const two = active(s).length === 2;
  switch (f.value) {
    case "reverse":
      s.direction = (s.direction * -1) as 1 | -1;
      next = two ? seat : nextSeat(s, seat);
      break;
    case "skip":
      next = nextSeat(s, seat, 2);
      break;
    case "skipAll":
      next = seat;
      break;
    case "flip": {
      s.side = s.side === "light" ? "dark" : "light";
      const nf = topFace(s);
      s.color = isWild(nf) ? palette(s)[randomInt(4)] : (nf.color as Color);
      ev.push({ kind: "flip", seat, text: `Everything flips to the ${s.side} side! Colour is ${s.color}` });
      break;
    }
    case "wildReverse4":
      s.direction = (s.direction * -1) as 1 | -1;
      next = nextSeat(s, seat);
      break;
    case "wildColor": {
      ev.push({ kind: "roulette", seat: next, text: `${s.seats[next].name} draws until ${s.color}` });
      draw(s, next, 0, ev, `until ${s.color}`, (c) => face(c, s.side).color === s.color);
      next = nextSeat(s, next);
      break;
    }
    case "7":
      if (target >= 0) {
        [me.hand, s.seats[target].hand] = [s.seats[target].hand, me.hand];
        ev.push({ kind: "swap", seat, text: `${me.name} swapped hands with ${s.seats[target].name}` });
      }
      break;
    case "0":
      if (s.rules.sevenZero) {
        const order = s.seats.map((_, i) => i).filter((i) => !s.seats[i].out);
        const hands = order.map((i) => s.seats[i].hand);
        order.forEach((i, k) => { s.seats[i].hand = hands[(k - s.direction + order.length) % order.length]; });
        ev.push({ kind: "rotate", seat, text: "Every hand moves along!" });
      }
      break;
  }

  const amount = drawAmount(f);
  if (amount >= 4 && s.pendingDraw > 0) achieve(s, seat, "combo", ev);
  if (amount) {
    s.pendingDraw += amount;
    if (f.value === "wild4" && s.rules.challenge) s.challenge = { by: seat, prevColor };
  }
  for (const p of s.seats) if (p.hand.length !== 1) p.calledUno = false;
  if (me.hand.length === 1 && !me.calledUno) s.unoTarget = seat;

  if (me.hand.length === 0) {
    const victim = s.pendingDraw ? next : -1;
    if (s.pendingDraw) {
      draw(s, next, s.pendingDraw, ev, `took +${s.pendingDraw}`);
      s.pendingDraw = 0;
    }
    s.challenge = null;
    if (s.phase !== "playing") return ev;
    if (!s.rules.playOn) {
      endRound(s, seat, ev);
      return ev;
    }
    finish(s, seat, ev);
    // A drawing victim also loses their turn. act() moves the turn off any seat that is out.
    if (s.phase === "playing") s.turn = victim >= 0 ? nextSeat(s, victim) : next;
    return ev;
  }
  if (s.pendingDraw) {
    s.turn = next;
    const victim = s.seats[next];
    const canStack = s.rules.stacking && victim.hand.some((c) => canPlay(s, c));
    if (!canStack && !s.challenge) {
      const n = s.pendingDraw;
      s.pendingDraw = 0;
      draw(s, next, n, ev, `took +${n}`);
      if (s.phase === "playing") s.turn = nextSeat(s, next);
    }
    return ev;
  }
  s.turn = next;
  return ev;
}

function endTurn(s: GameState, seat: number) {
  s.drawn = null;
  if (s.phase === "playing") s.turn = nextSeat(s, seat);
}

function endRound(s: GameState, winner: number, ev: GameEvent[]) {
  award(s, winner, ev);
  closeRound(s, ev);
}

/** The first player out scores the cards left in everyone else's hands. */
function award(s: GameState, winner: number, ev: GameEvent[]) {
  const pts = s.seats.reduce((sum, p, i) => (i === winner ? sum : sum + p.hand.reduce((t, c) => t + points(face(c, s.side)), 0)), 0);
  const w = s.seats[winner];
  w.score += pts;
  s.roundWinner = winner;
  s.lastRoundPoints = pts;
  ev.push({ kind: "roundOver", seat: winner, text: `${w.name} wins round ${s.round} (+${pts})`, data: { points: pts } });
  if ((w.peak ?? 0) >= 15) achieve(s, winner, "comeback", ev);
  if (w.drew === false) achieve(s, winner, "flawless", ev);
}

function achieve(s: GameState, seat: number, id: AchievementId, ev: GameEvent[]) {
  ev.push({ kind: "achievement", seat, text: `${s.seats[seat].name} unlocked ${ACHIEVEMENTS[id].title}`, data: { id } });
}

/** Playing on: take this seat out with the next place, and close the round when one player is left. */
function finish(s: GameState, seat: number, ev: GameEvent[]) {
  const p = s.seats[seat];
  p.out = true;
  p.place = s.seats.filter((x) => x.place).length + 1;
  if (s.roundWinner === null) award(s, seat, ev);
  else ev.push({ kind: "finish", seat, text: `${p.name} finished ${ordinal(p.place)}` });
  if (active(s).length <= 1) closeRound(s, ev);
}

function closeRound(s: GameState, ev: GameEvent[]) {
  const last = active(s)[0];
  if (s.rules.playOn && last) last.place = s.seats.filter((x) => x.place).length + 1;
  s.pendingDraw = 0;
  s.challenge = null;
  s.drawn = null;
  const w = s.seats[s.roundWinner!];
  const over = s.rules.targetScore === 0 || w.score >= s.rules.targetScore;
  s.phase = over ? "matchOver" : "roundOver";
  if (over) ev.push({ kind: "matchOver", seat: s.roundWinner!, text: `${w.name} wins the match with ${w.score} points!` });
}
