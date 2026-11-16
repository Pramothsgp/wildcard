import type { DeckKind } from "./cards.ts";

export type BotLevel = "easy" | "normal" | "hard";
export const BOT_LEVELS: BotLevel[] = ["easy", "normal", "hard"];

export type Rules = {
  deck: DeckKind;
  /** Stack draw cards of equal or higher value onto a pending draw. */
  stacking: boolean;
  /** 7 swaps hands with a chosen player, 0 passes every hand along. */
  sevenZero: boolean;
  /** Play an identical card out of turn. */
  jumpIn: boolean;
  /** Keep drawing until you get a playable card. */
  drawToMatch: boolean;
  /** Wild Draw 4 can be challenged. */
  challenge: boolean;
  /** Knocked out at 25 cards. */
  mercy: boolean;
  /** When someone goes out, the rest keep playing for the places. */
  playOn: boolean;
  /** How well the bots play. */
  botLevel: BotLevel;
  handSize: number;
  /** Match ends when someone reaches this. 0 = single round. */
  targetScore: number;
  turnSeconds: number;
};

const base: Rules = {
  deck: "classic",
  stacking: false,
  sevenZero: false,
  jumpIn: false,
  drawToMatch: false,
  challenge: true,
  mercy: false,
  playOn: false,
  botLevel: "normal",
  handSize: 7,
  targetScore: 500,
  turnSeconds: 30,
};

export const MODES = {
  classic: { name: "Classic", blurb: "The original rules. First to 500 wins.", rules: base },
  stack: { name: "Stack Attack", blurb: "Stack draw cards to pass the pain along.", rules: { ...base, stacking: true, challenge: false } },
  sevenZero: { name: "Seven-O", blurb: "7 swaps hands, 0 passes every hand.", rules: { ...base, sevenZero: true } },
  jumpIn: { name: "Jump-In", blurb: "Play an identical card out of turn.", rules: { ...base, jumpIn: true } },
  party: { name: "House Party", blurb: "Stacking, Seven-O and Jump-In together.", rules: { ...base, stacking: true, sevenZero: true, jumpIn: true, challenge: false } },
  flip: { name: "Flipside", blurb: "Double-sided cards. Flip to the brutal dark side.", rules: { ...base, deck: "flip" } },
  ruthless: { name: "Ruthless", blurb: "168 cards, draw 10s, forced stacking, knock-out at 25.", rules: { ...base, deck: "ruthless", stacking: true, sevenZero: true, drawToMatch: true, mercy: true, challenge: false, targetScore: 1000 } },
  speed: { name: "Speed", blurb: "10 seconds a turn, single round.", rules: { ...base, turnSeconds: 10, targetScore: 0 } },
} satisfies Record<string, { name: string; blurb: string; rules: Rules }>;

export type ModeId = keyof typeof MODES;
export const isModeId = (v: unknown): v is ModeId => typeof v === "string" && v in MODES;

const num = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : fallback;

const RULE_LABELS: Record<string, string> = {
  stacking: "stacking", sevenZero: "7 swaps / 0 rotates", jumpIn: "jump-in",
  drawToMatch: "draw until playable", challenge: "+4 challenge", mercy: "knock-out at 25", playOn: "play on",
};

/** House rules that differ from the mode's defaults, e.g. ["+ draw until playable"]. */
export function ruleChanges(mode: ModeId, rules: Rules): string[] {
  const base = MODES[mode].rules;
  return Object.keys(RULE_LABELS)
    .filter((k) => rules[k as keyof Rules] !== base[k as keyof Rules])
    .map((k) => `${rules[k as keyof Rules] ? "+" : "no"} ${RULE_LABELS[k]}`);
}

/** Clamp untrusted rule overrides from a client onto a mode's rules. */
export function sanitizeRules(mode: ModeId, input: unknown): Rules {
  const rules = { ...MODES[mode].rules };
  if (!input || typeof input !== "object") return rules;
  const o = input as Record<string, unknown>;
  for (const key of ["stacking", "sevenZero", "jumpIn", "drawToMatch", "challenge", "mercy", "playOn"] as const) {
    if (typeof o[key] === "boolean") rules[key] = o[key];
  }
  if (o.botLevel === "easy" || o.botLevel === "normal" || o.botLevel === "hard") rules.botLevel = o.botLevel;
  rules.handSize = num(o.handSize, 3, 12, rules.handSize);
  rules.targetScore = num(o.targetScore, 0, 5000, rules.targetScore);
  rules.turnSeconds = num(o.turnSeconds, 5, 120, rules.turnSeconds);
  return rules;
}
