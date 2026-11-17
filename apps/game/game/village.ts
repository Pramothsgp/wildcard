// Night Village: hidden roles. Wolves, a seer and a healer act at night; everyone votes by day.
// Secret moves are never written to the event log, so the history page can't leak them mid-game.
import { randomInt } from "node:crypto";
import { type GameEvent, shuffle } from "./engine.ts";
import { type Base, type BotMove, closeRound, fail, leading, newBase, pickOne, seatOf, tally } from "./party-core.ts";
import { type PartyAction, type PartyOpts, ROLES, type Role, type VillageView } from "./party-meta.ts";

export type VillageState = Base & {
  kind: "village";
  phase: VillageView["phase"];
  roles: Role[];
  alive: boolean[];
  day: number;
  /** Night: actor seat → target seat. */
  picks: Record<number, number>;
  /** Day: voter seat → target seat, or null to skip. */
  votes: Record<number, number | null>;
  /** Seats the seer has checked. */
  seen: number[];
  news: string[];
  winner: "wolves" | "village" | null;
  since: number;
};

const NIGHT_ROLES = new Set<Role>(["wolf", "seer", "healer"]);
const dayMs = (s: VillageState) => s.opts.seconds * 3000;
const living = (s: VillageState) => s.alive.flatMap((a, i) => (a ? [i] : []));
const actors = (s: VillageState) => living(s).filter((i) => NIGHT_ROLES.has(s.roles[i]));

export function create(players: { id: string; name: string; bot: boolean }[], opts: PartyOpts): VillageState {
  return { ...newBase(players, opts), kind: "village", phase: "reveal", roles: [], alive: [], day: 0, picks: {}, votes: {}, seen: [], news: [], winner: null, since: 0 };
}

/** 1 wolf up to 6 players, then about one per 4.5 players (2 at 7-10, 4 at 20). Always a seer; a healer from 5. */
export function dealRoles(n: number): Role[] {
  const roles: Role[] = Array.from({ length: n <= 6 ? 1 : Math.round(n / 4.5) }, () => "wolf");
  roles.push("seer");
  if (n >= 5) roles.push("healer");
  while (roles.length < n) roles.push("villager");
  return shuffle(roles);
}

export function start(s: VillageState, now: number): GameEvent[] {
  if (s.phase !== "reveal") fail("Round already in progress");
  s.round += 1;
  s.roles = dealRoles(s.players.length);
  s.alive = s.players.map(() => true);
  Object.assign(s, { day: 0, picks: {}, votes: {}, seen: [], news: [], winner: null, gained: [], winners: [], outcome: null });
  const wolves = s.roles.filter((r) => r === "wolf").length;
  nightfall(s, now);
  return [{ kind: "round", text: `Round ${s.round}: roles are dealt (${wolves} wolf${wolves > 1 ? "s" : ""}, a seer${s.roles.includes("healer") ? ", a healer" : ""}). Night falls...` }];
}

function nightfall(s: VillageState, now: number) {
  s.phase = "night";
  s.picks = {};
  s.votes = {};
  s.since = now;
  s.ends = now + s.opts.seconds * 1000;
}

export function act(s: VillageState, seat: number, a: PartyAction, now: number): GameEvent[] {
  const ev: GameEvent[] = [];
  if (!s.players[seat] || !s.alive[seat]) fail("You are out of this round");
  const t = a.type === "pick" || a.type === "vote" ? seatOf(s, a.target) : -1;
  if (a.type === "pick") {
    const role = s.roles[seat];
    if (s.phase !== "night" || !NIGHT_ROLES.has(role)) fail("Nothing for you to do tonight");
    if (t < 0 || !s.alive[t]) fail("Pick a player who is still in");
    if (role === "wolf" && s.roles[t] === "wolf") fail("Pick someone who isn't a wolf");
    if (role === "seer" && t === seat) fail("Pick someone else to check");
    s.picks[seat] = t;
    if (actors(s).every((i) => s.picks[i] !== undefined)) dawn(s, now, ev);
  } else if (a.type === "vote") {
    if (s.phase !== "day") fail("Voting is by day");
    if (a.target !== null && (t < 0 || !s.alive[t] || t === seat)) fail("Pick another player who is still in");
    s.votes[seat] = a.target === null ? null : t;
    if (living(s).every((i) => s.votes[i] !== undefined)) dusk(s, now, ev);
  } else fail("That move isn't part of this game");
  return ev;
}

/** End of the night: the wolves strike unless the healer guessed right. */
function dawn(s: VillageState, now: number, ev: GameEvent[]) {
  const wolfVotes = Object.fromEntries(Object.entries(s.picks).filter(([k]) => s.roles[Number(k)] === "wolf"));
  const { counts } = tally(wolfVotes);
  const best = Math.max(0, ...counts.values());
  const victim = pickOne([...counts].filter(([, c]) => c === best).map(([t]) => t)) ?? null;
  const healed = Object.entries(s.picks).find(([k]) => s.roles[Number(k)] === "healer")?.[1];
  const seer = Object.entries(s.picks).find(([k]) => s.roles[Number(k)] === "seer")?.[1];
  if (seer !== undefined && !s.seen.includes(seer)) s.seen.push(seer);
  s.day += 1;
  let text: string;
  if (victim === null) text = "A quiet night. Nobody was taken.";
  else if (victim === healed) text = "The wolves struck, but the healer saved their target. Nobody was taken.";
  else {
    s.alive[victim] = false;
    text = `${s.players[victim].name} was taken in the night. They were the ${ROLES[s.roles[victim]].name}.`;
  }
  s.news = [text];
  ev.push({ kind: "night", seat: victim ?? undefined, text: `Day ${s.day}: ${text}` });
  if (checkWin(s, now, ev)) return;
  s.phase = "day";
  s.picks = {};
  s.votes = {};
  s.since = now;
  s.ends = now + dayMs(s);
}

/** End of the day: most votes is sent away, unless skips match it or there's a tie. */
function dusk(s: VillageState, now: number, ev: GameEvent[]) {
  const { top, topCount, skips } = tally(s.votes);
  const out = top !== null && topCount > skips ? top : null;
  const text = out === null
    ? "The village couldn't agree. Nobody was voted out."
    : `${s.players[out].name} was voted out. They were the ${ROLES[s.roles[out]].name}.`;
  if (out !== null) s.alive[out] = false;
  s.news = [...s.news, text];
  ev.push({ kind: "exile", seat: out ?? undefined, text });
  if (checkWin(s, now, ev)) return;
  nightfall(s, now);
}

function checkWin(s: VillageState, now: number, ev: GameEvent[]): boolean {
  const wolves = living(s).filter((i) => s.roles[i] === "wolf").length;
  const rest = living(s).length - wolves;
  const winner = wolves === 0 ? "village" : wolves >= rest ? "wolves" : null;
  if (!winner) return false;
  s.winner = winner;
  const gained = s.players.map((_, i) => (ROLES[s.roles[i]].team === winner ? 30 + (s.alive[i] ? 10 : 0) : 0));
  const names = s.roles.flatMap((r, i) => (r === "wolf" ? [s.players[i].name] : [])).join(" and ");
  closeRound(s, gained, `${winner === "village" ? "The village wins" : "The wolves win"} round ${s.round}. The wolf${names.includes(" and ") ? "s were" : " was"} ${names}.`, now, ev);
  return true;
}

export function timeout(s: VillageState, now: number): GameEvent[] {
  const ev: GameEvent[] = [];
  if (s.phase === "night") dawn(s, now, ev);
  else if (s.phase === "day") dusk(s, now, ev);
  else if (s.phase === "reveal") return start(s, now);
  return ev;
}

export function botStep(s: VillageState, now: number): BotMove | null {
  const others = (seat: number) => living(s).filter((i) => i !== seat);
  if (s.phase === "night") {
    const seat = actors(s).find((i) => s.players[i].bot && s.picks[i] === undefined);
    if (seat === undefined) return null;
    const role = s.roles[seat];
    const prey = others(seat).filter((i) => s.roles[i] !== "wolf");
    const target =
      role === "wolf" ? (Object.entries(s.picks).find(([k, t]) => s.roles[Number(k)] === "wolf" && prey.includes(t))?.[1] ?? pickOne(prey))
      : role === "seer" ? (pickOne(others(seat).filter((i) => !s.seen.includes(i))) ?? pickOne(others(seat)))
      : randomInt(10) < 4 ? seat : pickOne(others(seat));
    if (target === undefined) return null;
    return { seat, action: { type: "pick", target: s.players[target].id }, at: now };
  }
  if (s.phase === "day") {
    const seat = living(s).find((i) => s.players[i].bot && s.votes[i] === undefined);
    if (seat === undefined) return null;
    const role = s.roles[seat];
    const lead = leading(s.votes, (t) => t === seat || (role === "wolf" && s.roles[t] === "wolf"));
    let target: number | null | undefined;
    if (role === "wolf") target = lead ?? pickOne(others(seat).filter((i) => s.roles[i] !== "wolf"));
    else if (role === "seer") target = s.seen.find((i) => s.alive[i] && s.roles[i] === "wolf") ?? lead ?? pickOne(others(seat));
    else target = lead !== undefined && randomInt(10) < 6 ? lead : randomInt(10) < 3 ? null : pickOne(others(seat));
    // Give people a chance to talk before bots vote.
    return { seat, action: { type: "vote", target: target == null ? null : s.players[target].id }, at: s.since + Math.min(20_000, dayMs(s) / 3) + seat * 900 };
  }
  return null;
}

export function view(s: VillageState, uid: string): VillageView {
  const me = seatOf(s, uid);
  const role = me >= 0 ? s.roles[me] : null;
  const over = s.phase === "reveal" || s.phase === "over";
  const id = (i: number) => s.players[i].id;
  const known: Record<string, Role> = {};
  s.roles.forEach((r, i) => {
    if (over || !s.alive[i] || i === me || (role === "wolf" && r === "wolf")) known[id(i)] = r;
  });
  const votes = s.phase === "day" ? s.votes : s.phase === "night" && role === "wolf" ? Object.fromEntries(Object.entries(s.picks).filter(([k]) => s.roles[Number(k)] === "wolf")) : {};
  return {
    kind: "village", phase: s.phase, round: s.round, rounds: s.opts.rounds, ends: s.ends, turn: null,
    // Who has acted at night would give the roles away.
    done: s.phase === "day" ? Object.keys(s.votes).map((k) => id(Number(k))) : [],
    winners: s.winners.map(id), outcome: s.outcome, day: s.day, yourRole: role,
    alive: living(s).map(id), known,
    votes: Object.fromEntries(Object.entries(votes).map(([k, t]) => [id(Number(k)), t === null ? null : id(t)])),
    seen: role === "seer" || over ? s.seen.map((i) => ({ id: id(i), wolf: s.roles[i] === "wolf" })) : [],
    yourPick: s.phase === "night" && s.picks[me] !== undefined ? id(s.picks[me]) : null,
    news: s.news, winner: s.winner,
  };
}
