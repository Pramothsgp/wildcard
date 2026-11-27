// Imposter: everyone but the imposter knows the word. Clue laps, a vote, and a last guess.
import { randomInt } from "node:crypto";
import { type GameEvent, shuffle } from "./engine.ts";
import { type Base, type BotMove, closeRound, fail, leading, newBase, norm, pickOne, seatOf } from "./party-core.ts";
import { type ImposterView, PACKS, type PackId, type PartyAction, type PartyOpts } from "./party-meta.ts";
import { type Entry, WORDS } from "./words.ts";

export type ImposterState = Base & {
  kind: "imposter";
  phase: ImposterView["phase"];
  pack: PackId;
  entry: number;
  /** Words already played this match, so they don't repeat. */
  used: string[];
  imposters: number[];
  start: number;
  turn: number;
  lap: number;
  clues: { seat: number; text: string }[];
  /** Each voter's suspects; everyone gets one pick per imposter. */
  votes: Record<number, number[]>;
  /** Everyone the vote pointed at (up to one per imposter). */
  accused: number[];
  guess: string | null;
  /** When the current phase began, so bots don't vote before people have read the clues. */
  since: number;
};

const entryOf = (s: ImposterState): Entry => WORDS[s.pack][s.entry];
const voteMs = (s: ImposterState) => s.opts.seconds * 3000;
/** Picks each player gets: one per imposter. */
const need = (s: ImposterState) => s.imposters.length;
const allVotes = (s: ImposterState) => Object.values(s.votes).flat();
const names = (seats: number[], s: ImposterState) => seats.map((i) => s.players[i].name).join(" and ");
function counts(s: ImposterState) {
  const c = new Map<number, number>();
  for (const t of allVotes(s)) c.set(t, (c.get(t) ?? 0) + 1);
  return c;
}

export function create(players: { id: string; name: string; bot: boolean }[], opts: PartyOpts): ImposterState {
  return {
    ...newBase(players, opts), kind: "imposter", phase: "reveal", pack: "food", entry: 0, used: [], imposters: [],
    start: 0, turn: 0, lap: 1, clues: [], votes: {}, accused: [], guess: null, since: 0,
  };
}

export function start(s: ImposterState, now: number): GameEvent[] {
  if (s.phase !== "reveal") fail("Round already in progress");
  s.round += 1;
  const packs = Object.keys(WORDS) as PackId[];
  s.pack = s.opts.pack === "mixed" ? packs[randomInt(packs.length)] : s.opts.pack;
  let fresh = WORDS[s.pack].map((_, i) => i).filter((i) => !s.used.includes(WORDS[s.pack][i].word));
  if (!fresh.length) fresh = WORDS[s.pack].map((_, i) => i);
  s.entry = pickOne(fresh)!;
  s.used.push(entryOf(s).word);
  const n = s.players.length;
  const count = Math.min(s.opts.imposters, n >= 12 ? 3 : n >= 6 ? 2 : 1);
  s.imposters = shuffle(s.players.map((_, i) => i)).slice(0, count);
  s.start = s.turn = (s.round - 1) % n;
  Object.assign(s, { lap: 1, clues: [], votes: {}, accused: [], guess: null, gained: [], winners: [], outcome: null, phase: "clues", since: now });
  s.ends = now + s.opts.seconds * 1000;
  return [{ kind: "round", text: `Round ${s.round}: the category is ${PACKS[s.pack]}. ${s.players[s.turn].name} gives the first clue.` }];
}

/** True if the clue gives the word away. */
function saysWord(text: string, word: string) {
  const w = norm(word);
  return norm(text) === w || text.toLowerCase().split(/[^a-z0-9]+/).includes(w) || (word.includes(" ") && norm(text).includes(w));
}

export function act(s: ImposterState, seat: number, a: PartyAction, now: number): GameEvent[] {
  const ev: GameEvent[] = [];
  const me = s.players[seat] ?? fail("You are not in this game");
  if (a.type === "clue") {
    if (s.phase !== "clues" || s.turn !== seat) fail("Not your turn to give a clue");
    const text = a.text.trim().replace(/\s+/g, " ").slice(0, 30);
    if (!text) fail("Type a clue");
    if (saysWord(text, entryOf(s).word)) fail("You can't say the word itself");
    s.clues.push({ seat, text });
    ev.push({ kind: "clue", seat, text: `${me.name}: "${text}"` });
    nextClue(s, now, ev);
  } else if (a.type === "vote") {
    if (s.phase !== "vote") fail("Voting isn't open");
    const t = seatOf(s, a.target);
    if (t < 0 || t === seat) fail("Pick another player");
    // Tapping a suspect toggles them; past the limit the oldest pick drops off.
    const mine = (s.votes[seat] ??= []);
    if (mine.includes(t)) {
      if (need(s) > 1) mine.splice(mine.indexOf(t), 1);
    } else if (mine.push(t) > need(s)) mine.shift();
    if (s.players.every((_, i) => (s.votes[i]?.length ?? 0) >= need(s))) resolveVote(s, now, ev);
  } else if (a.type === "guess") {
    if (s.phase !== "guess" || !s.imposters.includes(seat)) fail("Only a caught imposter can guess");
    s.guess = a.text.trim().slice(0, 40);
    const right = norm(s.guess) === norm(entryOf(s).word);
    ev.push({ kind: "guess", seat, text: `${me.name} guesses "${s.guess}"... ${right ? "correct!" : "wrong."}` });
    finish(s, right, now, ev);
  } else fail("That move isn't part of this game");
  return ev;
}

function nextClue(s: ImposterState, now: number, ev: GameEvent[]) {
  s.turn = (s.turn + 1) % s.players.length;
  if (s.turn === s.start) s.lap += 1;
  if (s.lap > s.opts.laps) {
    s.phase = "vote";
    s.since = now;
    s.ends = now + voteMs(s);
    ev.push({ kind: "vote", text: "Clues are in. Vote for the imposter." });
  } else s.ends = now + s.opts.seconds * 1000;
}

function resolveVote(s: ImposterState, now: number, ev: GameEvent[]) {
  const sorted = [...counts(s)].toSorted((a, b) => b[1] - a[1]);
  const summary = sorted.map(([t, c]) => `${s.players[t].name} ${c}`).join(", ");
  ev.push({ kind: "votes", text: `Votes: ${summary || "none"}` });
  // The top vote-getters are accused, one per imposter. A tie across the cut-off accuses none of the tied.
  const k = need(s);
  s.accused = sorted.slice(0, k).filter(([, c]) => c > (sorted[k]?.[1] ?? 0)).map(([t]) => t);
  const caught = s.accused.filter((i) => s.imposters.includes(i));
  const wrong = s.accused.filter((i) => !s.imposters.includes(i));
  if (caught.length === k) {
    s.phase = "guess";
    s.ends = now + Math.max(20, s.opts.seconds) * 1000;
    ev.push({ kind: "accuse", seat: caught[0], text: `${names(caught, s)} ${k > 1 ? "were the imposters" : "was the imposter"}! One guess at the word to steal the win...` });
    return;
  }
  const text = !s.accused.length ? "No clear vote. The imposter slips away."
    : [caught.length ? `${names(caught, s)} got caught, but not every imposter did.` : "", wrong.length ? `${names(wrong, s)} ${wrong.length > 1 ? "were" : "was"} not the imposter.` : ""].filter(Boolean).join(" ");
  ev.push({ kind: "accuse", text });
  finish(s, true, now, ev);
}

function finish(s: ImposterState, imposterWins: boolean, now: number, ev: GameEvent[]) {
  const caught = s.imposters.filter((i) => s.accused.includes(i)).length;
  const gained = s.players.map((_, i) => {
    const imp = s.imposters.includes(i);
    if (imposterWins) return imp ? (s.accused.includes(i) ? 20 : 30) : 0;
    return imp ? 0 : 20 + 10 * (s.votes[i] ?? []).filter((t) => s.imposters.includes(t)).length;
  });
  const how = !imposterWins ? "got caught" : caught === s.imposters.length ? "got caught but guessed it" : caught ? "weren't all caught" : "fooled everyone";
  const text = `The word was ${entryOf(s).word}. ${names(s.imposters, s)} ${how}. ${imposterWins ? "Imposter" : "Crew"} wins round ${s.round}.`;
  closeRound(s, gained, text, now, ev);
}

export function timeout(s: ImposterState, now: number): GameEvent[] {
  const ev: GameEvent[] = [];
  if (s.phase === "clues") {
    s.clues.push({ seat: s.turn, text: "(no clue)" });
    ev.push({ kind: "clue", seat: s.turn, text: `${s.players[s.turn].name} ran out of time` });
    nextClue(s, now, ev);
  } else if (s.phase === "vote") resolveVote(s, now, ev);
  else if (s.phase === "guess") {
    ev.push({ kind: "guess", seat: s.imposters[0], text: `${names(s.imposters, s)} ran out of time to guess` });
    finish(s, false, now, ev);
  } else if (s.phase === "reveal") return start(s, now);
  return ev;
}

/** The word in this category that best matches the clues so far (what an imposter bot thinks it is). */
function bestGuess(s: ImposterState): Entry {
  const said = new Set(s.clues.map((c) => norm(c.text)));
  const scored = WORDS[s.pack].map((e) => ({ e, n: e.clues.filter((c) => said.has(norm(c))).length }));
  const top = Math.max(...scored.map((x) => x.n));
  return pickOne(scored.filter((x) => x.n === top))!.e;
}

export function botStep(s: ImposterState, now: number): BotMove | null {
  const bot = (i: number) => s.players[i].bot;
  if (s.phase === "clues" && bot(s.turn)) {
    const said = new Set(s.clues.map((c) => norm(c.text)));
    const imp = s.imposters.includes(s.turn);
    // An imposter bot hints at whatever it thinks the word is; a crew bot uses the real word's clues.
    const pool = (imp ? bestGuess(s) : entryOf(s)).clues.filter((c) => !said.has(norm(c)) && !saysWord(c, entryOf(s).word));
    const text = pickOne(pool) ?? pickOne(WORDS[s.pack].flatMap((e) => e.clues).filter((c) => !saysWord(c, entryOf(s).word)))!;
    return { seat: s.turn, action: { type: "clue", text }, at: now };
  }
  if (s.phase === "vote") {
    const seat = s.players.findIndex((p, i) => p.bot && (s.votes[i]?.length ?? 0) < need(s));
    if (seat < 0) return null;
    const mine = s.votes[seat] ?? [];
    const others = s.players.map((_, i) => i).filter((i) => i !== seat && !mine.includes(i));
    let target: number;
    if (s.imposters.includes(seat)) {
      target = leading({ ...allVotes(s) }, (t) => t === seat || mine.includes(t)) ?? pickOne(others)!;
    } else {
      // Clues that belong to another word in the pack look suspicious.
      const real = new Set(entryOf(s).clues.map(norm));
      const fake = new Set(WORDS[s.pack].flatMap((e) => e.clues).map(norm).filter((c) => !real.has(c)));
      const votes = counts(s);
      const score = (i: number) => s.clues.filter((c) => c.seat === i).reduce((t, c) => t + (fake.has(norm(c.text)) ? 2 : c.text === "(no clue)" ? 1 : 0), 0) + (votes.get(i) ?? 0) + randomInt(100) / 100;
      target = others.toSorted((a, b) => score(b) - score(a))[0];
    }
    return { seat, action: { type: "vote", target: s.players[target].id }, at: s.since + Math.min(8000, voteMs(s) / 4) + seat * 700 + mine.length * 500 };
  }
  // Bots guess only when no person is among the imposters; a person gets the say.
  if (s.phase === "guess" && s.imposters.every(bot)) {
    return { seat: s.imposters[0], action: { type: "guess", text: bestGuess(s).word }, at: now + 2500 };
  }
  return null;
}

export function view(s: ImposterState, uid: string): ImposterView {
  const me = seatOf(s, uid);
  const imp = s.imposters.includes(me);
  const shown = s.phase === "reveal" || s.phase === "over";
  const id = (i: number | null) => (i === null ? null : s.players[i].id);
  return {
    kind: "imposter", phase: s.phase, round: s.round, rounds: s.opts.rounds, ends: s.ends,
    // In the guess phase any imposter may answer, so each one sees it as their turn.
    turn: s.phase === "clues" ? id(s.turn) : s.phase === "guess" ? id(imp ? me : s.imposters[0]) : null,
    done: s.phase === "vote" ? s.players.filter((_, i) => (s.votes[i]?.length ?? 0) >= need(s)).map((p) => p.id) : [],
    winners: s.winners.map((i) => s.players[i].id), outcome: s.outcome,
    gained: Object.fromEntries(s.gained.map((g, i) => [s.players[i].id, g])),
    category: PACKS[s.pack], word: imp && !shown ? null : entryOf(s).word, youAreImposter: imp,
    lap: Math.min(s.lap, s.opts.laps), laps: s.opts.laps,
    clues: s.clues.map((c) => ({ id: s.players[c.seat].id, text: c.text })),
    votes: s.phase === "clues" || s.phase === "vote" ? null : Object.fromEntries(Object.entries(s.votes).map(([k, t]) => [s.players[Number(k)].id, t.map((x) => s.players[x].id)])),
    picks: need(s), mine: (s.votes[me] ?? []).map((x) => s.players[x].id),
    accused: s.accused.map((x) => s.players[x].id), guess: s.guess, imposters: shown ? s.imposters.map((i) => s.players[i].id) : null,
  };
}
