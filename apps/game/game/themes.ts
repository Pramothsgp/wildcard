// Card themes: how the cards look and what the bots are called. Shared by server and client.
// All names and artwork are original or historical public figures; no third-party characters.

export const THEMES = {
  classic: {
    name: "Classic",
    blurb: "Clean cards with a gold lattice back.",
    bots: ["Ace", "Blitz", "Comet", "Dot", "Echo", "Fizz", "Gizmo", "Hex", "Ivy", "Jinx"],
  },
  heroes: {
    name: "Hero Squad",
    blurb: "Comic-book cards and a squad of original heroes.",
    bots: ["Shadow Lynx", "Volt Rider", "Titan Forge", "Aero Hawk", "Frost Warden", "Ember Fist", "Quantum Jade", "Star Sentinel", "Rune Knight", "Comet Blaze"],
  },
  legends: {
    name: "Tamil Legends",
    blurb: "Temple gold and kolam patterns. Play the great kings and poets.",
    bots: ["Karikalan", "Raja Raja", "Rajendra", "Velu Nachiyar", "Avvaiyar", "Thiruvalluvar", "Kannagi", "Kattabomman", "Pari Vallal", "Bharathi"],
  },
} satisfies Record<string, { name: string; blurb: string; bots: string[] }>;

export type ThemeId = keyof typeof THEMES;
export const isThemeId = (v: unknown): v is ThemeId => typeof v === "string" && v in THEMES;

/** Bot name for the nth bot at a table, e.g. "Karikalan (bot)". */
export const botName = (theme: ThemeId, n: number) => `${THEMES[theme].bots[n] ?? `Bot ${n + 1}`} (bot)`;
