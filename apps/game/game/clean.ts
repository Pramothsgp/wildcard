// Turn untrusted client input into valid settings and moves.
import { type Color, DARK_COLORS, LIGHT_COLORS } from "./cards.ts";
import { GameError } from "./engine.ts";
import { isModeId, sanitizeRules } from "./modes.ts";
import { DEFAULT_PARTY, MAX_PLAYERS, type PartyAction, isGameKind, sanitizeParty } from "./party-meta.ts";
import type { Action, RoomSettings } from "./protocol.ts";
import { isThemeId } from "./themes.ts";

export function cleanSettings(input: Partial<RoomSettings> | undefined, prev: RoomSettings): RoomSettings {
  const i = input && typeof input === "object" ? input : {};
  const mode = isModeId(i.mode) ? i.mode : prev.mode;
  const name = typeof i.name === "string" && i.name.trim() ? i.name.trim().slice(0, 40) : prev.name;
  const maxPlayers = typeof i.maxPlayers === "number" ? Math.min(MAX_PLAYERS, Math.max(2, Math.round(i.maxPlayers))) : prev.maxPlayers;
  const rules = sanitizeRules(mode, i.rules ?? (mode === prev.mode ? prev.rules : undefined));
  const theme = isThemeId(i.theme) ? i.theme : isThemeId(prev.theme) ? prev.theme : "classic";
  // Tables saved before party games existed have no `kind` or `partyRules`.
  const kind = isGameKind(i.kind) ? i.kind : (prev.kind ?? "wildcard");
  const partyRules = sanitizeParty(i.partyRules, prev.partyRules ?? DEFAULT_PARTY);
  return { kind, name, mode, rules, partyRules, maxPlayers, theme, isPublic: typeof i.isPublic === "boolean" ? i.isPublic : prev.isPublic };
}

const COLORS = new Set<string>([...LIGHT_COLORS, ...DARK_COLORS]);
export function cleanAction(a: unknown): Action {
  const o = (a && typeof a === "object" ? a : {}) as Record<string, unknown>;
  switch (o.type) {
    case "play":
      if (typeof o.cardId !== "number") break;
      return {
        type: "play", cardId: o.cardId,
        color: typeof o.color === "string" && COLORS.has(o.color) ? (o.color as Color) : undefined,
        target: typeof o.target === "string" ? o.target : undefined,
      };
    case "catch":
      if (typeof o.target === "string") return { type: "catch", target: o.target };
      break;
    case "draw": case "pass": case "uno": case "challenge":
      return { type: o.type };
  }
  throw new GameError("Bad action");
}

export function cleanPartyAction(a: unknown): PartyAction {
  const o = (a && typeof a === "object" ? a : {}) as Record<string, unknown>;
  const text = typeof o.text === "string" ? o.text.slice(0, 60) : "";
  switch (o.type) {
    case "clue": case "guess":
      return { type: o.type, text };
    case "vote":
      if (o.target === null || typeof o.target === "string") return { type: "vote", target: o.target };
      break;
    case "pick":
      if (typeof o.target === "string") return { type: "pick", target: o.target };
      break;
  }
  throw new GameError("Bad action");
}
