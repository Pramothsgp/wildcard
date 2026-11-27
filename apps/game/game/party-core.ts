// Shared server-side pieces of the party games: players, vote counting and the end of a round.
import { randomInt } from "node:crypto";
import { GameError, type GameEvent } from "./engine.ts";
import type { PartyAction, PartyOpts } from "./party-meta.ts";

export type PartyPlayer = { id: string; name: string; bot: boolean; score: number };

/** What every party game state has. Seats are indexes into `players`. */
export type Base = {
  opts: PartyOpts;
  round: number;
  players: PartyPlayer[];
  ends: number | null;
  /** Points each seat got in the round that just ended. */
  gained: number[];
  winners: number[];
  /** Top scorer once the match is over. */
  champ: number | null;
  outcome: string | null;
};

export type BotMove = { seat: number; action: PartyAction; at: number };

export const fail = (msg: string): never => { throw new GameError(msg); };
export const pickOne = <T>(a: T[]): T | undefined => (a.length ? a[randomInt(a.length)] : undefined);
export const seatOf = (s: Base, id: string | null | undefined) => s.players.findIndex((p) => p.id === id);
/** Lower case letters and digits only, for comparing words. */
export const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Most voted seat (null on a tie or no votes), with every count. Null votes are skips. */
export function tally(votes: Record<number, number | null>) {
  const counts = new Map<number, number>();
  let skips = 0;
  for (const t of Object.values(votes)) {
    if (t === null) skips++;
    else counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  const sorted = [...counts].toSorted((a, b) => b[1] - a[1]);
  const top = sorted[0] && sorted[0][1] !== sorted[1]?.[1] ? sorted[0][0] : null;
  return { top, topCount: sorted[0]?.[1] ?? 0, counts, skips };
}

/** Seat with the most votes so far, for bots that follow the room. */
export const leading = (votes: Record<number, number | null>, not: (seat: number) => boolean) =>
  [...tally(votes).counts].filter(([t]) => !not(t)).toSorted((a, b) => b[1] - a[1])[0]?.[0];

export const REVEAL_MS = 15_000;

/** Score the round, then move to the reveal (or the end of the match). `last` says if the match is over,
 * for games with several turns per round. */
export function closeRound(s: Base & { phase: string }, gained: number[], text: string, now: number, ev: GameEvent[], last = s.round >= s.opts.rounds) {
  s.gained = gained;
  s.winners = gained.flatMap((g, i) => (g > 0 ? [i] : []));
  gained.forEach((g, i) => (s.players[i].score += g));
  s.outcome = text;
  ev.push({ kind: "roundOver", seat: s.winners[0], text, data: { points: gained } });
  if (last) {
    s.phase = "over";
    s.ends = null;
    s.champ = s.players.reduce((best, p, i) => (p.score > s.players[best].score ? i : best), 0);
    const c = s.players[s.champ];
    ev.push({ kind: "matchOver", seat: s.champ, text: `${c.name} wins the match with ${c.score} points!` });
  } else {
    s.phase = "reveal";
    s.ends = now + REVEAL_MS;
  }
}

export const newBase = (players: { id: string; name: string; bot: boolean }[], opts: PartyOpts): Base => ({
  opts, round: 0, players: players.map((p) => ({ ...p, score: 0 })), ends: null, gained: [], winners: [], champ: null, outcome: null,
});
