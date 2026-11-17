// Party games (Imposter, Night Village): names, options and what the client sees.
// No server imports, so the browser can use it too.

/** Every game seats up to this many. */
export const MAX_PLAYERS = 20;

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
} satisfies Record<string, { name: string; blurb: string; min: number; max: number; points: string }>;

export type GameKind = keyof typeof GAMES;
export type PartyKind = Exclude<GameKind, "wildcard">;
export const isGameKind = (v: unknown): v is GameKind => typeof v === "string" && v in GAMES;
export const gameName = (k: string) => (isGameKind(k) ? GAMES[k].name : k);
/** The stored room mode is a Wildcard mode, or the party game's kind. */
export const kindOf = (mode: string): GameKind => (isGameKind(mode) ? mode : "wildcard");
/** Each game lives under its own path: /wildcard, /imposter, /village. */
export const roomPath = (kind: GameKind, code: string) => `/${kind}/room/${code}`;

export const PACKS = {
  mixed: "Mixed",
  food: "Food",
  animals: "Animals",
  places: "Places",
  cricket: "Cricket",
  festivals: "Festivals",
  jobs: "Jobs",
} as const;
export type PackId = Exclude<keyof typeof PACKS, "mixed">;
export const isPack = (v: unknown): v is keyof typeof PACKS => typeof v === "string" && v in PACKS;

export type PartyOpts = {
  /** Imposter: word pack. */
  pack: keyof typeof PACKS;
  /** Imposter: most imposters wanted (2 needs 6+ players, 3 needs 12+). */
  imposters: number;
  /** Imposter: how many times round the table each player gives a clue. */
  laps: number;
  /** Rounds in the match. */
  rounds: number;
  /** Seconds per clue (Imposter) or per night (Night Village). Votes get three times this. */
  seconds: number;
};

export const DEFAULT_PARTY: PartyOpts = { pack: "mixed", imposters: 1, laps: 2, rounds: 3, seconds: 30 };

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
  };
}

export type PartyAction =
  | { type: "clue"; text: string }
  | { type: "vote"; target: string | null }
  | { type: "guess"; text: string }
  | { type: "pick"; target: string };

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
  /** voter id → target id. Shown once voting has closed. */
  votes: Record<string, string | null> | null;
  accused: string | null;
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

export type PartyView = ImposterView | VillageView;

/** How to play, shown in the Rules panel. */
export const PARTY_RULES: Record<PartyKind, { title: string; text: string }[]> = {
  imposter: [
    { title: "Goal", text: "Everyone sees the same secret word except the imposter, who only sees the category. Big tables can have 2 imposters (6+ players) or 3 (12+). The group wants to find the imposter; the imposter wants to blend in." },
    { title: "Clues", text: "Players take turns giving one short clue about the word. Too obvious and the imposter learns the word; too vague and you look like the imposter. You can't say the word itself." },
    { title: "Vote", text: "After the clue laps everyone votes for who they think the imposter is. The player with the most votes is accused. A tie means nobody is accused and the imposter escapes." },
    { title: "Last chance", text: "If the imposter is accused they get one guess at the word. Guess right and they still win." },
    { title: "Scoring", text: "Imposter escapes: +30. Imposter caught but guesses the word: +20. Imposter caught: everyone else +20, and +10 more if you voted for the imposter. The match winner gets +100 on the leaderboard." },
  ],
  village: [
    { title: "Goal", text: "Each player secretly gets a role. The village wins when every wolf is out. The wolves win when they equal or outnumber everyone else." },
    { title: "Night", text: "Wolves pick someone to remove. The seer checks one player. The healer protects one player. Everyone else waits." },
    { title: "Day", text: "Find out who was lost in the night, talk it over in chat, then vote to send someone away (or skip). Most votes goes; a tie or more skips sends nobody. Their role is shown." },
    { title: "Roles", text: "Wolf, Seer, Healer and Villager. 1 wolf up to 6 players, then about one wolf for every 4 or 5 players (4 wolves at 20). A healer joins from 5 players." },
    { title: "Fair play", text: "Players who are out can still read and type in chat. Please keep quiet about what you know." },
    { title: "Scoring", text: "Everyone on the winning side scores +30, and +10 more if still in at the end. The match winner gets +100 on the leaderboard." },
  ],
};
