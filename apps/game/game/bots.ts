// What the server plays for a bot, or for a human on autopilot. Three skill levels.
import { randomInt } from "node:crypto";
import { type Card, type Color, drawAmount, face, isWild } from "./cards.ts";
import { type GameState, canPlay, nextSeat, palette } from "./engine.ts";
import type { BotLevel } from "./modes.ts";
import type { Action } from "./protocol.ts";

/**
 * "autopilot" stands in for a human who left: it plays its first valid card and never calls
 * "WILDCARD!", so others can still catch it. It used to only draw, but seats that only draw hoard
 * the deck until the game can't move.
 */
type Level = BotLevel | "autopilot";

/** The colour the seat holds most of, so a wild keeps their hand flowing. */
function bestColor(s: GameState, hand: Card[]): Color {
  const counts = new Map<Color, number>();
  for (const c of hand) {
    const col = face(c, s.side).color;
    if (col !== "wild") counts.set(col, (counts.get(col) ?? 0) + 1);
  }
  return [...counts].toSorted((x, y) => y[1] - x[1])[0]?.[0] ?? palette(s)[randomInt(4)];
}

const ATTACK = new Set(["skip", "reverse", "skipAll", "draw1", "draw2", "draw4", "draw5"]);

/** Hard bots: hit a nearly-out next player with action cards, otherwise shed numbers and save wilds. */
function hardPick(s: GameState, seat: number, playable: Card[], hand: Card[]): Card {
  const f = (c: Card) => face(c, s.side);
  const next = s.seats[nextSeat(s, seat)];
  if (next.hand.length <= 2) {
    const attack = playable.toSorted((a, b) => drawAmount(f(b)) - drawAmount(f(a))).find((c) => ATTACK.has(f(c).value) || drawAmount(f(c)) > 0);
    if (attack) return attack;
  }
  const best = bestColor(s, hand);
  const plain = playable.filter((c) => !isWild(f(c)) && !drawAmount(f(c)));
  // Numbers in the colour we hold most, highest first (they cost the most points if caught).
  const numbers = plain.toSorted((a, b) => Number(f(b).color === best) - Number(f(a).color === best) || (Number(f(b).value) || 0) - (Number(f(a).value) || 0));
  return numbers[0] ?? playable.find((c) => !isWild(f(c))) ?? playable[0];
}

export function botAction(s: GameState, seat: number, level: Level): Action {
  const me = s.seats[seat];
  const callUno = level === "hard" || level === "normal" || (level === "easy" && randomInt(2) === 0);
  if (callUno && me.hand.length === 2 && !me.calledUno) return { type: "uno" };
  const playable = me.hand.filter((c) => canPlay(s, c) && (s.drawn === null || c.id === s.drawn));
  // Easy bots sometimes miss a play they had.
  if (level === "easy" && playable.length && s.drawn === null && !s.pendingDraw && randomInt(10) < 3) return { type: "draw" };
  if (playable.length) {
    const card =
      level === "hard" ? hardPick(s, seat, playable, me.hand)
      : level === "easy" ? playable[randomInt(playable.length)]
      : level === "autopilot" ? playable[0]
      : playable.find((c) => !isWild(face(c, s.side))) ?? playable[0];
    const color = level === "easy" ? palette(s)[randomInt(4)] : bestColor(s, me.hand.filter((c) => c !== card));
    const others = s.seats.filter((p, i) => i !== seat && !p.out).toSorted((x, y) => x.hand.length - y.hand.length);
    return { type: "play", cardId: card.id, color, target: others[0]?.id };
  }
  return s.drawn !== null ? { type: "pass" } : { type: "draw" };
}
