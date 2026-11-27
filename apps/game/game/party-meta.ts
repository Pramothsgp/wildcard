// Party games (Imposter, Night Village, Draw it): names, options and what the client sees.
// No server imports, so the browser can use it too.

/** Every game seats up to this many. */
export const MAX_PLAYERS = 25;

export const GAMES = {
  wildcard: {
    name: "Wildcard", blurb: "The 3D shedding card game. Match colour or number, empty your hand first.", min: 2, max: MAX_PLAYERS,
    points: "Win a round to score the cards left in everyone else's hands, plus 100 for winning a match.",
  },
  imposter: {
    name: "Imposter", blurb: "Everyone gets the secret word except the imposter. Give clues, then vote out the faker.", min: 3, max: MAX_PLAYERS,
    points: "Catch the imposter for +20 (+10 if you voted right), or escape as the imposter for +30. Winning a match adds 100.",
  },
  village: {
    name: "Night Village", blurb: "Hidden roles. Wolves strike at night, the village votes by day. Find them before it's too late.", min: 4, max: MAX_PLAYERS,
    points: "Everyone on the winning side scores +30, +10 more if still in at the end. Winning a match adds 100.",
  },
  draw: {
    name: "Draw it", blurb: "Draw, guess, laugh. Classic drawing and guessing, or team relay where your teammates draw the word in turns.", min: 3, max: MAX_PLAYERS,
    points: "Guess the word for +50, plus up to +50 for speed (more for hard words). Classic drawers get +10 for each player who guesses. Winning a match adds 100.",
  },
} satisfies Record<string, { name: string; blurb: string; min: number; max: number; points: string }>;

export type GameKind = keyof typeof GAMES;
export type PartyKind = Exclude<GameKind, "wildcard">;
export const isGameKind = (v: unknown): v is GameKind => typeof v === "string" && v in GAMES;
export const gameName = (k: string) => (isGameKind(k) ? GAMES[k].name : k);
/** The stored room mode is a Wildcard mode, or the party game's kind. */
export const kindOf = (mode: string): GameKind => (isGameKind(mode) ? mode : "wildcard");
/** Each game lives under its own path: /wildcard, /imposter, /village, /draw. */
export const roomPath = (kind: GameKind, code: string) => `/${kind}/room/${code}`;

export const PACKS = {
  mixed: "Mixed",
  food: "Food",
  animals: "Animals",
  places: "Places",
  cricket: "Cricket",
  festivals: "Festivals",
  jobs: "Jobs",
  home: "Around the house",
  transport: "Getting around",
} as const;
export type PackId = Exclude<keyof typeof PACKS, "mixed">;
export const isPack = (v: unknown): v is keyof typeof PACKS => typeof v === "string" && v in PACKS;

export type PartyOpts = {
  /** Imposter and Draw it: word pack. */
  pack: keyof typeof PACKS;
  /** Imposter: most imposters wanted (2 needs 6+ players, 3 needs 12+). */
  imposters: number;
  /** Imposter: how many times round the table each player gives a clue. Draw it: turns each drawer gets per word. */
  laps: number;
  /** Rounds in the match. */
  rounds: number;
  /** Seconds per clue (Imposter), per night (Night Village) or per drawer's turn (Draw it). Votes get three times this. */
  seconds: number;
  /** Draw it: how many teams in team relay (fewer if there aren't 2 players for each). */
  teams: number;
  /** Draw it: classic (one drawer, everyone guesses) or team relay (teammates draw in turns for one guesser). */
  style: DrawStyle;
  /** Team relay: random teams, or the host puts each player on a team (teamOf). */
  teamPick: "random" | "manual";
  /** Team relay, manual teams: player id → team number. Players not listed are placed automatically. */
  teamOf: Record<string, number>;
  /** Team relay: players guessing on each turn (as many as the team allows). */
  guessers: number;
  /** Team relay: players drawing on each turn. 0 means everyone else on the team. */
  drawers: number;
  /** Team relay: whether the other teams see the word. */
  showWord: boolean;
  /** Team relay: if the team runs out of time, the other teams get a go at guessing it. Only when they can't see it. */
  steal: boolean;
  /** Team relay: how long the other teams have to steal a missed word. */
  stealSeconds: number;
};

export const DRAW_STYLES = { classic: "Classic", relay: "Team relay" } as const;
export type DrawStyle = keyof typeof DRAW_STYLES;

export const DEFAULT_PARTY: PartyOpts = { pack: "mixed", imposters: 1, laps: 2, rounds: 3, seconds: 30, teams: 2, style: "classic",
  teamPick: "random", teamOf: {}, guessers: 1, drawers: 0, showWord: true, steal: false, stealSeconds: 20,
};

const num = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : fallback;

/** Clamp untrusted options from a client. */
export function sanitizeParty(input: unknown, prev: PartyOpts = DEFAULT_PARTY): PartyOpts {
  const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  return {
    pack: isPack(o.pack) ? o.pack : prev.pack,
    imposters: num(o.imposters, 1, 3, prev.imposters),
    laps: num(o.laps, 1, 3, prev.laps),
    rounds: num(o.rounds, 1, 10, prev.rounds),
    seconds: num(o.seconds, 10, 120, prev.seconds),
    teams: num(o.teams, 2, 4, prev.teams ?? DEFAULT_PARTY.teams),
    style: typeof o.style === "string" && o.style in DRAW_STYLES ? (o.style as DrawStyle) : (prev.style ?? DEFAULT_PARTY.style),
    teamPick: o.teamPick === "random" || o.teamPick === "manual" ? o.teamPick : (prev.teamPick ?? DEFAULT_PARTY.teamPick),
    teamOf: teamOf(o.teamOf, prev.teamOf ?? {}),
    guessers: num(o.guessers, 1, 5, prev.guessers ?? DEFAULT_PARTY.guessers),
    drawers: num(o.drawers, 0, 10, prev.drawers ?? DEFAULT_PARTY.drawers),
    showWord: typeof o.showWord === "boolean" ? o.showWord : (prev.showWord ?? DEFAULT_PARTY.showWord),
    steal: typeof o.steal === "boolean" ? o.steal : (prev.steal ?? DEFAULT_PARTY.steal),
    stealSeconds: num(o.stealSeconds, 5, 120, prev.stealSeconds ?? DEFAULT_PARTY.stealSeconds),
  };
}

/**
 * Manual team picks from a client, merged into the current ones: a client sends only the players it
 * changed, so two quick picks can't overwrite each other. Team numbers are 0 to 3; -1 means "back to auto".
 */
function teamOf(v: unknown, prev: Record<string, number>): Record<string, number> {
  const next = { ...prev };
  if (v && typeof v === "object") {
    for (const [id, t] of Object.entries(v as Record<string, unknown>)) {
      if (id.length > 64 || typeof t !== "number" || !Number.isInteger(t) || t < -1 || t > 3) continue;
      if (t === -1) delete next[id];
      else next[id] = t;
    }
  }
  return Object.fromEntries(Object.entries(next).slice(0, MAX_PLAYERS * 2));
}

export type PartyAction =
  | { type: "clue"; text: string }
  | { type: "vote"; target: string | null }
  | { type: "guess"; text: string }
  | { type: "pick"; target: string }
  /** Draw it: choose one of the offered words. */
  | { type: "word"; index: number }
  /** Draw it: finish your drawing turn early and hand the pen on. */
  | { type: "pass" };

export type Role = "wolf" | "seer" | "healer" | "villager";
export const ROLES: Record<Role, { name: string; team: "wolves" | "village"; detail: string }> = {
  wolf: { name: "Wolf", team: "wolves", detail: "Each night, pick someone to remove with the other wolves. By day, blend in." },
  seer: { name: "Seer", team: "village", detail: "Each night, check one player to learn if they are a wolf." },
  healer: { name: "Healer", team: "village", detail: "Each night, protect one player (you can pick yourself). If the wolves pick them, they live." },
  villager: { name: "Villager", team: "village", detail: "No night power. Listen, ask questions and vote out the wolves." },
};

type Common = {
  round: number;
  rounds: number;
  /** When the current phase times out (ms since epoch), or null when waiting on the host. */
  ends: number | null;
  /** Whose go it is, for the seat highlight. */
  turn: string | null;
  /** Ids of everyone who has acted in this phase (not what they did). */
  done: string[];
  /** Winners of the round that just ended. */
  winners: string[];
  /** Points each player got in the round that just ended. */
  gained: Record<string, number>;
  outcome: string | null;
};

export type ImposterView = Common & {
  kind: "imposter";
  phase: "clues" | "vote" | "guess" | "reveal" | "over";
  category: string;
  /** Null for the imposter until the round is revealed. */
  word: string | null;
  youAreImposter: boolean;
  lap: number;
  laps: number;
  clues: { id: string; text: string }[];
  /** voter id → the suspects they picked. Shown once voting has closed. */
  votes: Record<string, string[]> | null;
  /** How many suspects each player picks: one per imposter. */
  picks: number;
  /** Your own picks this round. */
  mine: string[];
  accused: string[];
  guess: string | null;
  /** Revealed at the end of the round. */
  imposters: string[] | null;
};

export type VillageView = Common & {
  kind: "village";
  phase: "night" | "day" | "reveal" | "over";
  day: number;
  yourRole: Role | null;
  alive: string[];
  /** Fellow wolves (for wolves), or every role once the round is over. */
  known: Record<string, Role>;
  /** Day votes so far, voter → target (null = skip). Night picks of your own pack for wolves. */
  votes: Record<string, string | null>;
  /** What the seer has learned. */
  seen: { id: string; wolf: boolean }[];
  /** Your own pick this night, if any. */
  yourPick: string | null;
  news: string[];
  winner: "wolves" | "village" | null;
};

/** Draw it team names and colours, by team number. */
export const TEAMS = [
  { name: "Red", color: "#ef4444" },
  { name: "Blue", color: "#3b82f6" },
  { name: "Green", color: "#22c55e" },
  { name: "Gold", color: "#eab308" },
];

export type DrawView = Common & {
  kind: "draw";
  style: DrawStyle;
  /** pick: the (first) drawer chooses a word. draw: the drawing is on. steal: team relay, the other teams
   * get a go at a word the team missed. */
  phase: "pick" | "draw" | "steal" | "reveal" | "over";
  /** Team relay: members and total points of each team, by team number (see TEAMS). Empty in classic. */
  teams: { members: string[]; score: number }[];
  yourTeam: number | null;
  /** Team relay: the team playing this word. */
  active: number;
  /** Team relay: the players guessing this turn. Empty in classic, where everyone but the drawer guesses. */
  guessers: string[];
  /** Whose turn it is to draw, and the drawing order. */
  drawer: string | null;
  drawers: string[];
  slot: number;
  slots: number;
  /** The word, for everyone who may see it: the drawer and players who already guessed it (classic),
   * everyone except the guesser (team relay), and everyone once the round is over. */
  word: string | null;
  /** The word with unrevealed letters as underscores, e.g. "P _ _ _ a". */
  hint: string;
  category: string;
  level: "easy" | "medium" | "hard" | null;
  /** Words to choose from, only for the drawer picking one. */
  choices: { word: string; level: "easy" | "medium" | "hard" }[] | null;
  /** Wrong guesses. `close` is only set on your own guesses. */
  guesses: { id: string; text: string; close: boolean }[];
  /** Players who got the word, in order. */
  solved: string[];
  canGuess: boolean;
  canDraw: boolean;
  /** Changes with every new word, so screens know to wipe the board. */
  turnKey: number;
};

export type PartyView = ImposterView | VillageView | DrawView;

/** How to play, shown in the Rules panel. */
export const PARTY_RULES: Record<PartyKind, { title: string; text: string }[]> = {
  imposter: [
    { title: "Goal", text: "Everyone sees the same secret word except the imposter, who only sees the category. Big tables can have 2 imposters (6+ players) or 3 (12+). The group wants to find the imposter; the imposter wants to blend in." },
    { title: "Clues", text: "Players take turns giving one short clue about the word. Too obvious and the imposter learns the word; too vague and you look like the imposter. You can't say the word itself." },
    { title: "Vote", text: "After the clue laps everyone votes for who they think the imposter is, picking one suspect per imposter. The most-voted players are accused, one per imposter. A tie at the cut-off accuses none of the tied. Every imposter has to be accused for the crew to win." },
    { title: "Last chance", text: "If every imposter is accused they get one guess at the word between them. Guess right and they still win." },
    { title: "Scoring", text: "Imposter escapes: +30. Imposter caught but their side wins: +20. All imposters caught: everyone else +20, and +10 more for each imposter you voted for. The match winner gets +100 on the leaderboard." },
  ],
  village: [
    { title: "Goal", text: "Each player secretly gets a role. The village wins when every wolf is out. The wolves win when they equal or outnumber everyone else." },
    { title: "Night", text: "Wolves pick someone to remove. The seer checks one player. The healer protects one player. Everyone else waits." },
    { title: "Day", text: "Find out who was lost in the night, talk it over in chat, then vote to send someone away (or skip). Most votes goes; a tie or more skips sends nobody. Their role is shown." },
    { title: "Roles", text: "Wolf, Seer, Healer and Villager. 1 wolf up to 6 players, then about one wolf for every 4 or 5 players (4 wolves at 20, 6 at 25). A healer joins from 5 players." },
    { title: "Fair play", text: "Players who are out can still read and type in chat. Please keep quiet about what you know." },
    { title: "Scoring", text: "Everyone on the winning side scores +30, and +10 more if still in at the end. The match winner gets +100 on the leaderboard." },
  ],
  draw: [
    { title: "Two ways to play", text: "Classic: players take turns drawing a word while everyone else guesses. Team relay: players split into teams and the teams take turns; one player guesses while their teammates draw the word together." },
    { title: "Classic", text: "The drawer picks one of three words and has the set time to draw it. Everyone else guesses; the faster you get it, the more you score, and once you have it you see the word too. The turn ends when everyone has guessed or time runs out." },
    { title: "Team relay", text: "On your team's turn some players guess and the rest draw: the first drawer picks one of three words, then each drawer draws for the set number of seconds before the pen passes on, all on the same drawing. The guessers never see the word. Roles rotate every turn." },
    { title: "Team relay options", text: "The host sets these before starting: random teams or picking each player's team, how many guess and how many draw each turn (anyone left over sits the turn out and can't see the word), whether other teams see the word, and steals. With steals on (only when other teams can't see the word), a word the team hasn't guessed when their time runs out goes to the other teams for a set number of seconds: the first right guess scores +30 for their whole team." },
    { title: "Hints", text: "Letters of the word appear as time goes by. Wrong guesses are shown; a guess that is nearly right is marked as close, for you only. No letters or numbers in the drawing!" },
    { title: "Tools", text: "Pen, eraser, paint bucket, line, box and oval, 16 colours plus any custom colour, four brush sizes, undo, redo and clear. Drawers can hand over early with Pass." },
    { title: "Words", text: "The drawer picks from an easy, a medium and a hard word. Easy words score 0.8 times the points, hard words 1.3 times. With the Mixed pack, words come from the themed packs and a list of everyday things to draw. Many words are from Google's Quick, Draw! (quickdraw.withgoogle.com), used under CC BY 4.0." },
    { title: "Scoring", text: "Classic: guess it for +50 plus up to +50 for speed; the drawer gets +10 for each player who guesses. Team relay: when the guesser gets it, everyone on the team gets +50 plus up to +50 for speed. Then the word's level applies. The match winner gets +100 on the leaderboard." },
  ],
};
