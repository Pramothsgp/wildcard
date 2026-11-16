// Card themes: how the cards look, what the bots are called, and the table and room around them.
// Shared by server and client. All names and artwork are original or historical public figures;
// no third-party characters.

export type Backdrop = "space" | "temple" | "city" | "festival" | "harvest" | "stadium";
type Theme = {
  name: string;
  blurb: string;
  bots: string[];
  /** Felt colours, centre to edge. */
  felt: [string, string, string];
  backdrop: Backdrop;
  /** Which sound pack the table uses. */
  sound: "classic" | "temple" | "action" | "space";
};

export const THEMES = {
  classic: {
    name: "Classic",
    blurb: "Clean cards with a gold lattice back.",
    bots: ["Ace", "Blitz", "Comet", "Dot", "Echo", "Fizz", "Gizmo", "Hex", "Ivy", "Jinx"],
    felt: ["#17604f", "#0e4638", "#072a22"], backdrop: "space", sound: "classic",
  },
  heroes: {
    name: "Hero Squad",
    blurb: "Comic-book cards and a squad of original heroes.",
    bots: ["Shadow Lynx", "Volt Rider", "Titan Forge", "Aero Hawk", "Frost Warden", "Ember Fist", "Quantum Jade", "Star Sentinel", "Rune Knight", "Comet Blaze"],
    felt: ["#1d3a7a", "#142a5c", "#0a1838"], backdrop: "city", sound: "action",
  },
  action: {
    name: "Action Heroes",
    blurb: "A cast of original action figures, a different hero on every card.",
    bots: ["Master Lin", "Kage", "Prism Trooper", "Nova Scout", "Vine Tracker", "Ronin Kenji", "Mecha Bolt", "El Trueno", "Sand Archer", "Bjorn Axe"],
    felt: ["#3a2a5e", "#271c44", "#140e26"], backdrop: "city", sound: "action",
  },
  mythic: {
    name: "Mythic Warriors",
    blurb: "Original warriors in Greek, Norse and Tamil style.",
    bots: ["Kallias", "Ione", "Theron", "Sigrun", "Ulf Ironside", "Astrid", "Maravan", "Ilavarasi", "Velan", "Senni"],
    felt: ["#5a3e22", "#422c17", "#24170b"], backdrop: "temple", sound: "temple",
  },
  fleet: {
    name: "Space Fleet",
    blurb: "Original starships on every card, flown by ace pilots.",
    bots: ["Vega", "Orion Six", "Nebula Fox", "Halley", "Quasar", "Lyra", "Pulsar", "Rigel", "Comet Kai", "Sol Seven"],
    felt: ["#16244a", "#0e1834", "#060b1c"], backdrop: "space", sound: "space",
  },
  legends: {
    name: "Tamil Legends",
    blurb: "Temple gold and kolam patterns. Play the great kings and poets.",
    bots: ["Karikalan", "Raja Raja", "Rajendra", "Velu Nachiyar", "Avvaiyar", "Thiruvalluvar", "Kannagi", "Kattabomman", "Pari Vallal", "Bharathi"],
    felt: ["#6a1a24", "#4e1018", "#2a070c"], backdrop: "temple", sound: "temple",
  },
  moovendar: {
    name: "Moovendar",
    blurb: "The three crowned kings: Chera bow, Chola tiger and Pandya fish, one per colour.",
    bots: ["Raja Raja", "Senguttuvan", "Nedunchezhiyan", "Rajendra", "Ilango Adigal", "Kadungon", "Karikalan", "Kundavai", "Cheraman Perumal", "Sundara Pandyan"],
    felt: ["#7a1a1e", "#5a1014", "#30070a"], backdrop: "temple", sound: "temple",
  },
  pongal: {
    name: "Pongal",
    blurb: "Sugarcane, kolam and the overflowing pot of the harvest festival.",
    bots: ["Kathir", "Thenmozhi", "Selvi", "Arivu", "Malar", "Ponni", "Elango", "Vaigai", "Kani", "Nila"],
    felt: ["#6b5a12", "#4f420c", "#2a2306"], backdrop: "harvest", sound: "temple",
  },
  diwali: {
    name: "Diwali",
    blurb: "Diyas, rangoli and a sky full of light.",
    bots: ["Deepa", "Jyoti", "Roshan", "Prakash", "Tara", "Aarav", "Diya", "Ujjwal", "Noor", "Kiran"],
    felt: ["#4a1a5e", "#341045", "#1b0826"], backdrop: "festival", sound: "temple",
  },
  cricket: {
    name: "Cricket",
    blurb: "Player cards with stats, floodlights and a packed stadium. Invented players only.",
    bots: ["Kesav Malhar", "Arav Thendral", "Nilan Suryan", "Vikran Devar", "Samar Kaveri", "Dhruvan Iniyan", "Madhav Selvan", "Irai Anbu", "Tarun Kavin", "Ezhil Varan"],
    felt: ["#2f7a3a", "#23602c", "#143a1a"], backdrop: "stadium", sound: "action",
  },
  christmas: {
    name: "Christmas",
    blurb: "Pine trees, baubles and falling snow.",
    bots: ["Holly", "Noel", "Ivy", "Jasper", "Carol", "Frost", "Robin", "Garland", "Juniper", "Winter"],
    felt: ["#1e5a32", "#134224", "#0a2614"], backdrop: "festival", sound: "classic",
  },
} satisfies Record<string, Theme>;

export type ThemeId = keyof typeof THEMES;
export const isThemeId = (v: unknown): v is ThemeId => typeof v === "string" && v in THEMES;
export const themeOf = (id: ThemeId | undefined): Theme => THEMES[id ?? "classic"] ?? THEMES.classic;

/** Bot name for the nth bot at a table, e.g. "Karikalan (bot)". */
export const botName = (theme: ThemeId, n: number) => `${themeOf(theme).bots[n] ?? `Bot ${n + 1}`} (bot)`;
