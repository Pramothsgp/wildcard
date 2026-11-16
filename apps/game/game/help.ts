// Player-facing rule explanations, shared by the lobby hints and the Rules panel.
import type { DeckKind, Face, Value } from "./cards.ts";
import type { Rules } from "./modes.ts";

export type Toggle = "stacking" | "sevenZero" | "jumpIn" | "drawToMatch" | "challenge" | "mercy" | "playOn";

export const RULE_INFO: Record<Toggle, { label: string; hint: string; detail: string }> = {
  stacking: {
    label: "Stack draw cards",
    hint: "Pass a +2/+4 on instead of drawing.",
    detail:
      "When a draw card is played on you, you may play a draw card of the same or higher value on top (colour doesn't matter: +2 on +2, +4 on +2, but never +2 on +4). The amounts add up and pass to the next player. Whoever can't or won't stack draws the full total and loses their turn. Off: you draw straight away.",
  },
  sevenZero: {
    label: "7 swaps, 0 rotates",
    hint: "7 = swap hands with someone. 0 = everyone passes their hand on.",
    detail:
      "Play a 7 and you swap your whole hand with a player you choose. Play a 0 and every player passes their hand to the next player in the direction of play. Off: 7 and 0 are ordinary number cards.",
  },
  jumpIn: {
    label: "Jump-in",
    hint: "Play an exact copy of the top card, even out of turn.",
    detail:
      "If you hold the identical card to the one on top of the pile (same colour and same number or symbol), you can play it at any time, even when it isn't your turn. Play then carries on from you, so anyone between is skipped. Not allowed with wild cards or while someone has cards to draw. Your jump-in cards glow even when it's not your turn.",
  },
  drawToMatch: {
    label: "Draw until playable",
    hint: "Can't play? Keep drawing until you can.",
    detail:
      "When you choose to draw, you keep drawing until you get a card you can play, then you may play it or pass. This can mean many cards at once. Off: you draw exactly one card; play it if you can, or pass.",
  },
  challenge: {
    label: "Challenge Wild +4",
    hint: "Call out a +4 played when they had another option.",
    detail:
      "A Wild Draw 4 is only meant to be played when you have no card of the colour in play. When one is played on you, a Challenge button appears. If they did hold that colour, they draw 4 and you draw nothing. If they didn't, you draw 6 instead of 4. Off: you just take the 4.",
  },
  mercy: {
    label: "Knock-out at 25 cards",
    hint: "Reach 25 cards and you're out of the round.",
    detail:
      "Anyone holding 25 or more cards is knocked out of the round; their cards go back into the deck. If everyone else is knocked out, the last player left wins the round.",
  },
  playOn: {
    label: "Play on after finishing",
    hint: "First out wins; the rest keep playing for places.",
    detail:
      "The first player to empty their hand wins the round and scores the cards left in everyone else's hands, as usual. Instead of the round ending, everyone else keeps playing for 2nd, 3rd and so on until one player is left holding cards. Players who have finished can see every remaining hand while they watch.",
  },
};

export const FIELD_HINTS = {
  targetScore: "Points needed to win the match. 0 = one round only.",
  turnSeconds: "Time per turn. When it runs out the game draws for you.",
  handSize: "Cards dealt to each player (usually 7).",
  maxPlayers: "Seats at the table, 2 to 10.",
  isPublic: "Show this table in Open tables. Otherwise join by code or link only.",
  botLevel: "Easy bots miss plays. Hard bots save wilds and hit whoever is about to win.",
};

export const CARD_HELP: Partial<Record<Value, string>> = {
  skip: "The next player loses their turn.",
  reverse: "Play changes direction. With 2 players it works like Skip.",
  draw1: "The next player draws 1 and loses their turn.",
  draw2: "The next player draws 2 and loses their turn.",
  draw4: "The next player draws 4 and loses their turn.",
  draw5: "The next player draws 5 and loses their turn.",
  skipAll: "Everyone else is skipped: you play again.",
  flip: "Everything flips to the other side: the pile, the deck and every hand. Colours change too.",
  discardAll: "Also throw away every other card of this colour from your hand.",
  wild: "Play on anything and pick the colour.",
  wild4: "Pick the colour; the next player draws 4 and loses their turn.",
  wild6: "Pick the colour; the next player draws 6 and loses their turn.",
  wild10: "Pick the colour; the next player draws 10 and loses their turn.",
  wildReverse4: "Reverses direction, then the next player draws 4 and loses their turn.",
  wildColor: "Pick a colour; the next player draws until they get that colour and loses their turn.",
};

/** The special cards in a deck, as faces to draw in the Rules panel. */
export function deckSpecials(deck: DeckKind): { title: string; faces: Face[] }[] {
  if (deck === "flip") {
    return [
      { title: "Light side", faces: [f("red", "skip"), f("blue", "reverse"), f("green", "draw1"), f("yellow", "flip"), f("wild", "wild"), f("wild", "wild4")] },
      { title: "Dark side", faces: [f("pink", "skipAll"), f("teal", "reverse"), f("orange", "draw5"), f("purple", "flip"), f("wild", "wild"), f("wild", "wildColor")] },
    ];
  }
  if (deck === "ruthless") {
    return [{
      title: "Action cards",
      faces: [f("red", "skip"), f("blue", "reverse"), f("green", "draw2"), f("yellow", "draw4"), f("red", "discardAll"), f("blue", "skipAll"),
        f("wild", "wildReverse4"), f("wild", "wild6"), f("wild", "wild10"), f("wild", "wildColor")],
    }];
  }
  return [{ title: "Action cards", faces: [f("red", "skip"), f("blue", "reverse"), f("green", "draw2"), f("wild", "wild"), f("wild", "wild4")] }];
}

const f = (color: Face["color"], value: Value): Face => ({ color, value });

/** Badges shown on the lobby. firstWin and matchWin come from results; the rest are game events. */
export const ACHIEVEMENTS = {
  firstWin: { title: "First Blood", detail: "Win your first round." },
  matchWin: { title: "Champion", detail: "Win a whole match." },
  comeback: { title: "Comeback Kid", detail: "Win a round after holding 15 or more cards." },
  combo: { title: "Pile On", detail: "Stack a +4 or bigger onto a draw that's already coming." },
  flawless: { title: "Flawless", detail: "Win a round without drawing a single card." },
} satisfies Record<string, { title: string; detail: string }>;
export type AchievementId = keyof typeof ACHIEVEMENTS;

/** Quick reactions a player can send. A fixed list, so nothing typed goes out this way. */
export const REACTIONS = ["👏", "😂", "😮", "😤", "🔥", "Nice!", "Not again", "GG", "Unlucky", "Wildcard!"] as const;
export const REACTION_MS = 4500;

/** Avatars: the ten action heroes and four royal emblems. Drawn client-side from the id. */
export const AVATARS = ["hero0", "hero1", "hero2", "hero3", "hero4", "hero5", "hero6", "hero7", "hero8", "hero9", "bow", "tiger", "fish", "lotus"] as const;
export type AvatarId = (typeof AVATARS)[number];

/** 1 → "1st", 12 → "12th", 22 → "22nd". */
export const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? "th" : (["th", "st", "nd", "rd"][n % 10] ?? "th")}`;

export const activeToggles = (rules: Rules) => (Object.keys(RULE_INFO) as Toggle[]).filter((k) => rules[k]);
