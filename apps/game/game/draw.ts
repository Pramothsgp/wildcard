// Draw it. Classic: players take turns drawing a word while everyone else guesses.
// Team relay: teams take turns; one player guesses while their teammates draw the same word in turns,
// and everyone but the guesser can see the word. The drawing itself is relayed by rooms (see sketch-ops).
import { randomInt } from "node:crypto";
import { type GameEvent, shuffle } from "./engine.ts";
import { type Base, type BotMove, closeRound, fail, newBase, norm, pickOne, seatOf } from "./party-core.ts";
import { DRAW_WORDS, type Level } from "./draw-words.ts";
import { type DrawStyle, type DrawView, PACKS, type PackId, type PartyAction, type PartyOpts, TEAMS } from "./party-meta.ts";
import { WORDS } from "./words.ts";

type Choice = { word: string; level: Level; category: string };
/** Harder words score more. */
const LEVEL_POINTS: Record<Level, number> = { easy: 0.8, medium: 1, hard: 1.3 };
const LEVEL_OF = new Map(Object.entries(DRAW_WORDS).flatMap(([l, ws]) => ws.map((w) => [norm(w), l as Level])));
const EVERYDAY = "Everyday things";

export type DrawState = Base & {
  kind: "draw";
  phase: DrawView["phase"];
  style: DrawStyle;
  /** Team number of each seat. All 0 in classic. */
  team: number[];
  teamCount: number;
  /** Words played so far in the match (1 after the first starts). */
  turnNo: number;
  /** Team relay: how many times each team has had a guesser, so it rotates. */
  turnsOf: number[];
  guesser: number | null;
  /** Drawing order for this word; the current drawer is drawers[slot % length]. */
  drawers: number[];
  slot: number;
  slots: number;
  slotMs: number;
  choices: Choice[];
  word: string;
  level: Level;
  category: string;
  used: string[];
  /** Letter positions in the order they are revealed as hints. */
  reveal: number[];
  guesses: { seat: number; text: string; close: boolean }[];
  solved: number[];
  /** Points earned so far this word. */
  pts: number[];
  /** When the current drawing turn started. */
  since: number;
  /** Bots guess at most once per drawing turn: seat → slot of their last guess. */
  tried: Record<number, number>;
};

const PICK_MS = 15_000;
const drawerOf = (s: DrawState) => s.drawers[s.slot % s.drawers.length];
const relay = (s: DrawState) => s.style === "relay";
const membersOf = (s: DrawState, t: number) => s.players.flatMap((_, i) => (s.team[i] === t ? [i] : []));
const totalTurns = (s: DrawState) => s.opts.rounds * (relay(s) ? s.teamCount : s.players.length);

export function create(players: { id: string; name: string; bot: boolean }[], opts: PartyOpts): DrawState {
  const n = players.length;
  const style = opts.style ?? "classic";
  // Team relay needs a guesser and at least one drawer per team.
  const teamCount = style === "relay" ? Math.max(1, Math.min(opts.teams ?? 2, Math.floor(n / 2))) : 1;
  const team = Array.from({ length: n }, () => 0);
  shuffle(players.map((_, i) => i)).forEach((seat, k) => (team[seat] = k % teamCount));
  return {
    ...newBase(players, opts), kind: "draw", phase: "reveal", style, team, teamCount, turnNo: 0, turnsOf: Array.from({ length: teamCount }, () => 0),
    guesser: null, drawers: [], slot: 0, slots: 1, slotMs: opts.seconds * 1000, choices: [], word: "", level: "medium", category: "", used: [], reveal: [],
    guesses: [], solved: [], pts: [], since: 0, tried: {},
  };
}

export function start(s: DrawState, now: number): GameEvent[] {
  if (s.phase !== "reveal") fail("Round already in progress");
  s.turnNo += 1;
  const n = s.players.length;
  s.slotMs = s.opts.seconds * 1000;
  if (relay(s)) {
    const t = (s.turnNo - 1) % s.teamCount;
    s.round = Math.ceil(s.turnNo / s.teamCount);
    const members = membersOf(s, t);
    const k = s.turnsOf[t]++;
    s.guesser = members[k % members.length];
    const rest = members.filter((i) => i !== s.guesser);
    // Start the drawing order somewhere new each time, so the same teammate doesn't always pick the word.
    s.drawers = rest.map((_, i) => rest[(i + k) % rest.length]);
    s.slots = Math.max(2, s.drawers.length * s.opts.laps);
  } else {
    s.round = Math.ceil(s.turnNo / n);
    s.guesser = null;
    s.drawers = [(s.turnNo - 1) % n];
    // One drawer, three turns of the set time: a letter is revealed at each step.
    s.slots = 3;
  }
  s.choices = offer(s);
  Object.assign(s, { phase: "pick", slot: 0, guesses: [], solved: [], pts: Array.from({ length: n }, () => 0), tried: {}, reveal: [], word: "", gained: [], winners: [], outcome: null, since: now });
  s.ends = now + PICK_MS;
  const who = s.players[s.drawers[0]].name;
  const text = relay(s)
    ? `Round ${s.round}: Team ${TEAMS[(s.turnNo - 1) % s.teamCount].name}. ${s.players[s.guesser!].name} guesses, ${who} picks the word.`
    : `Round ${s.round}: ${who} is picking a word to draw.`;
  return [{ kind: "round", text }];
}

/** Every word the table can get: one pack's words, or (mixed) the everyday list plus every pack. */
function pool(s: DrawState): Choice[] {
  const packs = s.opts.pack === "mixed" ? (Object.keys(WORDS) as PackId[]) : [s.opts.pack];
  const themed = packs.flatMap((pack) => WORDS[pack].map((e) => ({ word: e.word, level: LEVEL_OF.get(norm(e.word)) ?? "medium", category: PACKS[pack] })));
  if (s.opts.pack !== "mixed") return themed;
  const seen = new Set(themed.map((c) => norm(c.word)));
  const everyday = Object.entries(DRAW_WORDS).flatMap(([level, ws]) => ws.filter((w) => !seen.has(norm(w))).map((word) => ({ word, level: level as Level, category: EVERYDAY })));
  return [...themed, ...everyday];
}

/** Three words not played yet this match: an easy, a medium and a hard one where the pack has them. */
function offer(s: DrawState): Choice[] {
  let all = pool(s);
  const fresh = all.filter((c) => !s.used.includes(c.word));
  if (fresh.length >= 3) all = fresh;
  const picks = (["easy", "medium", "hard"] as Level[]).flatMap((l) => pickOne(all.filter((c) => c.level === l)) ?? []);
  for (const c of shuffle(all)) if (picks.length < 3 && !picks.includes(c)) picks.push(c);
  return picks;
}

/** Two words this close count as "close": a typo or two. */
function distance(a: string, b: string) {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}

const canGuess = (s: DrawState, seat: number) =>
  s.phase === "draw" && !s.solved.includes(seat) && (relay(s) ? seat === s.guesser : seat !== drawerOf(s));

export function act(s: DrawState, seat: number, a: PartyAction, now: number): GameEvent[] {
  const ev: GameEvent[] = [];
  const me = s.players[seat] ?? fail("You are not in this game");
  if (a.type === "word") {
    if (s.phase !== "pick" || s.drawers[0] !== seat) fail("It's not your turn to pick a word");
    if (!s.choices[a.index]) fail("Pick one of the words");
    begin(s, a.index, now, ev);
  } else if (a.type === "pass") {
    if (s.phase !== "draw" || drawerOf(s) !== seat) fail("It's not your turn to draw");
    ev.push({ kind: "pass", seat, text: `${me.name} passed the pen` });
    nextSlot(s, now, ev);
  } else if (a.type === "guess") {
    if (!canGuess(s, seat)) fail(relay(s) && s.phase === "draw" ? "Only the guesser can guess" : "You can't guess right now");
    const text = a.text.trim().replace(/\s+/g, " ").slice(0, 40);
    if (!text) fail("Type a guess");
    s.tried[seat] = s.slot;
    const want = norm(s.word);
    const got = norm(text);
    if (got === want) return solve(s, seat, now, ev);
    const close = got.length > 1 && distance(got, want) <= (want.length >= 6 ? 2 : 1);
    s.guesses = [...s.guesses, { seat, text, close }].slice(-40);
    ev.push({ kind: "guess", seat, text: `${me.name}: ${text}` });
  } else fail("That move isn't part of this game");
  return ev;
}

function begin(s: DrawState, i: number, now: number, ev: GameEvent[]) {
  const c = s.choices[i];
  Object.assign(s, { word: c.word, level: c.level, category: c.category });
  s.used.push(c.word);
  s.reveal = shuffle([...c.word].flatMap((ch, k) => (/[a-z0-9]/i.test(ch) ? [k] : [])));
  s.phase = "draw";
  s.slot = 0;
  s.since = now;
  s.ends = now + s.slotMs;
  ev.push({ kind: "draw", seat: drawerOf(s), text: `${s.players[drawerOf(s)].name} is drawing (${c.category}, ${c.level}, ${c.word.length} letters)` });
}

function nextSlot(s: DrawState, now: number, ev: GameEvent[]) {
  s.slot += 1;
  if (s.slot >= s.slots) return finish(s, now, ev);
  s.since = now;
  s.ends = now + s.slotMs;
  if (relay(s)) ev.push({ kind: "turn", seat: drawerOf(s), text: `The pen passes to ${s.players[drawerOf(s)].name}` });
}

/** Share of the drawing time still left, 1 at the start and 0 at the end. */
function speed(s: DrawState, now: number) {
  const left = (s.slots - s.slot - 1) * s.slotMs + Math.max(0, (s.ends ?? now) - now);
  return Math.max(0, Math.min(1, left / (s.slots * s.slotMs)));
}

function solve(s: DrawState, seat: number, now: number, ev: GameEvent[]): GameEvent[] {
  const bonus = Math.round((50 + 50 * speed(s, now)) * LEVEL_POINTS[s.level]);
  s.solved.push(seat);
  ev.push({ kind: "solved", seat, text: `${s.players[seat].name} guessed the word!` });
  if (relay(s)) {
    for (const i of membersOf(s, s.team[seat])) s.pts[i] += bonus;
    finish(s, now, ev);
  } else {
    s.pts[seat] += bonus;
    s.pts[drawerOf(s)] += 10;
    if (s.players.every((_, i) => i === drawerOf(s) || s.solved.includes(i))) finish(s, now, ev);
  }
  return ev;
}

function finish(s: DrawState, now: number, ev: GameEvent[]) {
  const got = s.solved.length;
  const text = relay(s)
    ? `The word was ${s.word}. ${s.players[s.guesser!].name} ${got ? "got it" : "didn't get it"}${got ? `: Team ${TEAMS[s.team[s.guesser!]].name} scores` : ""}.`
    : `The word was ${s.word}. ${got} of ${s.players.length - 1} guessed it.`;
  closeRound(s, [...s.pts], text, now, ev, s.turnNo >= totalTurns(s));
}

export function timeout(s: DrawState, now: number): GameEvent[] {
  const ev: GameEvent[] = [];
  if (s.phase === "pick") begin(s, randomInt(s.choices.length), now, ev);
  else if (s.phase === "draw") nextSlot(s, now, ev);
  else if (s.phase === "reveal") return start(s, now);
  return ev;
}

export function botStep(s: DrawState, now: number): BotMove | null {
  const bot = (i: number) => s.players[i].bot;
  if (s.phase === "pick" && bot(s.drawers[0])) return { seat: s.drawers[0], action: { type: "word", index: randomInt(s.choices.length) }, at: now + 1500 };
  if (s.phase !== "draw") return null;
  // ponytail: bots can't draw, so a bot drawer holds the pen for half its turn, then passes it and the
  // hint letters do the work. Long enough that a person guessing still gets time to think.
  if (bot(drawerOf(s))) return { seat: drawerOf(s), action: { type: "pass" }, at: s.since + Math.max(3000, s.slotMs / 2) };
  const seat = s.players.findIndex((_, i) => bot(i) && canGuess(s, i) && s.tried[i] !== s.slot);
  if (seat < 0) return null;
  // More likely to get it as the drawing (and the hints) build up.
  const right = randomInt(100) < Math.min(80, 15 + 25 * s.slot);
  const wrong = pickOne(pool(s).map((c) => c.word).filter((w) => w !== s.word)) ?? "?";
  return { seat, action: { type: "guess", text: right ? s.word : wrong }, at: s.since + Math.min(s.slotMs * 0.6, 3000 + seat * 900) };
}

/** Which word the board belongs to, and whose turn it is to draw or pick (for rooms). */
export const drawingNow = (s: DrawState) => ({
  key: s.turnNo,
  drawer: s.phase === "draw" ? s.players[drawerOf(s)].id : null,
  waitingOn: s.phase === "pick" ? s.drawers[0] : s.phase === "draw" ? drawerOf(s) : null,
});

/** The word with letters not yet revealed as underscores. Up to half the letters show by the end. */
function hint(s: DrawState) {
  const shown = new Set(s.reveal.slice(0, Math.min(Math.floor(s.reveal.length / 2), s.slot)));
  return [...s.word].map((ch, k) => (/[a-z0-9]/i.test(ch) && !shown.has(k) ? "_" : ch)).join("");
}

export function view(s: DrawState, uid: string): DrawView {
  const me = seatOf(s, uid);
  const id = (i: number | null) => (i === null || i < 0 ? null : s.players[i].id);
  const over = s.phase === "reveal" || s.phase === "over";
  const drawer = s.drawers.length ? drawerOf(s) : null;
  const sees = over || (relay(s) ? me !== s.guesser : me === drawer || s.solved.includes(me));
  return {
    kind: "draw", style: s.style, phase: s.phase, round: s.round, rounds: s.opts.rounds, ends: s.ends,
    turn: s.phase === "pick" ? id(s.drawers[0]) : s.phase === "draw" ? id(drawer) : null,
    done: s.solved.map((i) => s.players[i].id),
    winners: s.winners.map((i) => s.players[i].id), outcome: s.outcome,
    gained: Object.fromEntries(s.gained.map((g, i) => [s.players[i].id, g])),
    teams: relay(s) ? Array.from({ length: s.teamCount }, (_, t) => ({ members: membersOf(s, t).map((i) => s.players[i].id), score: membersOf(s, t).reduce((n, i) => n + s.players[i].score, 0) })) : [],
    yourTeam: relay(s) && me >= 0 ? s.team[me] : null,
    active: relay(s) && s.turnNo ? (s.turnNo - 1) % s.teamCount : 0,
    guesser: id(s.guesser), drawer: id(drawer), drawers: s.drawers.map((i) => s.players[i].id), slot: s.slot, slots: s.slots,
    word: s.word && sees ? s.word : null,
    hint: s.word ? hint(s) : "",
    category: s.word ? s.category : "",
    level: s.word ? s.level : null,
    choices: s.phase === "pick" && me === s.drawers[0] ? s.choices.map((c) => ({ word: c.word, level: c.level })) : null,
    guesses: s.guesses.map((g) => ({ id: s.players[g.seat].id, text: g.text, close: g.close && g.seat === me })),
    solved: s.solved.map((i) => s.players[i].id),
    canGuess: me >= 0 && canGuess(s, me),
    canDraw: s.phase === "draw" && me === drawer,
    turnKey: s.turnNo,
  };
}
