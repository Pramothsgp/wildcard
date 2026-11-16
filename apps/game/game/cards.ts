// Card model, decks and the rules about a single card. No game state here.

export const LIGHT_COLORS = ["red", "yellow", "green", "blue"] as const;
export const DARK_COLORS = ["pink", "teal", "orange", "purple"] as const;
export type Color = (typeof LIGHT_COLORS)[number] | (typeof DARK_COLORS)[number];

export type Value =
  | "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"
  | "skip" | "reverse" | "draw1" | "draw2" | "draw4" | "draw5"
  | "skipAll" | "flip" | "discardAll"
  | "wild" | "wild4" | "wild6" | "wild10" | "wildReverse4" | "wildColor";

export type Face = { color: Color | "wild"; value: Value };
/** `dark` only exists in the Flipside deck. */
export type Card = { id: number; light: Face; dark?: Face };
export type DeckKind = "classic" | "flip" | "ruthless";
export type Side = "light" | "dark";

export const face = (card: Card, side: Side): Face =>
  side === "dark" && card.dark ? card.dark : card.light;

export const isWild = (f: Face) => f.color === "wild";

/** How many cards a face makes the next player draw. "wildColor" is draw-until-colour. */
export function drawAmount(f: Face): number {
  switch (f.value) {
    case "draw1": return 1;
    case "draw2": return 2;
    case "draw4": case "wild4": case "wildReverse4": return 4;
    case "draw5": return 5;
    case "wild6": return 6;
    case "wild10": return 10;
    default: return 0;
  }
}

export function points(f: Face): number {
  if (/^\d$/.test(f.value)) return Number(f.value);
  if (f.value === "draw1") return 10;
  if (isWild(f)) return f.value === "wildColor" ? 60 : 50;
  if (f.value === "skipAll") return 30;
  return 20;
}

const NUMBERS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

function times<T>(n: number, make: () => T): T[] {
  return Array.from({ length: n }, make);
}

function classicFaces(colors: readonly Color[], actions: Value[], wilds: [Value, number][]): Face[] {
  const faces: Face[] = [];
  for (const color of colors) {
    faces.push({ color, value: "0" });
    for (const value of [...NUMBERS, ...actions]) {
      faces.push({ color, value }, { color, value });
    }
  }
  for (const [value, count] of wilds) faces.push(...times(count, () => ({ color: "wild" as const, value })));
  return faces;
}

export function buildDeck(kind: DeckKind, shuffle: <T>(a: T[]) => T[]): Card[] {
  let id = 0;
  if (kind === "classic") {
    const faces = classicFaces(LIGHT_COLORS, ["skip", "reverse", "draw2"], [["wild", 4], ["wild4", 4]]);
    return faces.map((light) => ({ id: id++, light }));
  }
  if (kind === "flip") {
    // Light side: draw1 + flip; dark side: draw5, skipAll, flip, wildColor. Same card count on both.
    const light = classicFaces(LIGHT_COLORS, ["skip", "reverse", "draw1", "flip"], [["wild", 4], ["wild4", 4]]);
    const dark = classicFaces(DARK_COLORS, ["skipAll", "reverse", "draw5", "flip"], [["wild", 4], ["wildColor", 4]]);
    // Pair sides randomly so the back of a card tells you nothing useful.
    const darkShuffled = shuffle(dark);
    return light.map((l, i) => ({ id: id++, light: l, dark: darkShuffled[i % darkShuffled.length] }));
  }
  // Ruthless: bigger, nastier deck.
  const faces: Face[] = [];
  for (const color of LIGHT_COLORS) {
    for (const value of ["0", ...NUMBERS] as Value[]) faces.push({ color, value }, { color, value });
    for (const [value, n] of [["skip", 3], ["reverse", 3], ["draw2", 3], ["draw4", 2], ["discardAll", 3], ["skipAll", 2]] as [Value, number][]) {
      faces.push(...times(n, () => ({ color, value })));
    }
  }
  for (const [value, n] of [["wildReverse4", 8], ["wild6", 4], ["wild10", 4], ["wildColor", 8]] as [Value, number][]) {
    faces.push(...times(n, () => ({ color: "wild" as const, value })));
  }
  return faces.map((light) => ({ id: id++, light }));
}

export const SYMBOL: Record<Value, string> = {
  "0": "0", "1": "1", "2": "2", "3": "3", "4": "4", "5": "5", "6": "6", "7": "7", "8": "8", "9": "9",
  skip: "⊘", reverse: "⇄", draw1: "+1", draw2: "+2", draw4: "+4", draw5: "+5",
  skipAll: "⊗", flip: "↻", discardAll: "≡",
  wild: "W", wild4: "+4", wild6: "+6", wild10: "+10", wildReverse4: "⇄4", wildColor: "?",
};

export const LABEL: Record<Value, string> = {
  ...SYMBOL,
  skip: "Skip", reverse: "Reverse", draw1: "Draw 1", draw2: "Draw 2", draw4: "Draw 4", draw5: "Draw 5",
  skipAll: "Skip everyone", flip: "Flip", discardAll: "Discard all",
  wild: "Wild", wild4: "Wild Draw 4", wild6: "Wild Draw 6", wild10: "Wild Draw 10",
  wildReverse4: "Wild Reverse Draw 4", wildColor: "Colour Roulette",
};

export const describe = (f: Face) => (isWild(f) ? LABEL[f.value] : `${f.color} ${LABEL[f.value]}`);
