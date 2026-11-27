// Messages between browser and game server. Types only, safe to import on the client.
import type { Color, Face, Side } from "./cards.ts";
import type { ModeId, Rules } from "./modes.ts";
import type { GameKind, PartyAction, PartyOpts, PartyView } from "./party-meta.ts";
import type { ThemeId } from "./themes.ts";

export type Action =
  | { type: "play"; cardId: number; color?: Color; target?: string }
  | { type: "draw" }
  | { type: "pass" }
  | { type: "uno" }
  | { type: "catch"; target: string }
  | { type: "challenge" };

export type ClientCard = { id: number; face: Face };

/** Which game the table plays. `mode` and `rules` are for Wildcard; `partyRules` for the other games. */
export type RoomSettings = { kind: GameKind; name: string; mode: ModeId; rules: Rules; partyRules: PartyOpts; isPublic: boolean; maxPlayers: number; theme: ThemeId };

export type RoomSummary = {
  code: string;
  name: string;
  kind: GameKind;
  mode: ModeId;
  status: "lobby" | "playing";
  players: number;
  maxPlayers: number;
  host: string;
};

export type PlayerView = {
  id: string;
  name: string;
  bot: boolean;
  auto: boolean;
  connected: boolean;
  count: number;
  score: number;
  calledUno: boolean;
  out: boolean;
  /** Flipside only: the sides of their cards everyone else can see. */
  backs: Face[] | null;
  /** Finishing position when "play on" is used, 1 = first out. */
  place: number | null;
  /** Their actual hand, shown only to players who have already finished. */
  reveal: Face[] | null;
  avatar: string | null;
};

export type Reaction = { id: string; text: string; at: number };

export type GameView = {
  phase: "playing" | "roundOver" | "matchOver";
  round: number;
  side: Side;
  color: Color;
  direction: 1 | -1;
  turn: string;
  pendingDraw: number;
  canChallenge: boolean;
  drawn: number | null;
  unoTarget: string | null;
  pile: ClientCard[];
  drawCount: number;
  hand: ClientCard[];
  playable: number[];
  roundWinner: string | null;
  lastRoundPoints: number;
  deadline: number | null;
};

export type LogLine = { seq: number; text: string; at: number; kind: string };
export type ChatLine = { id: string; name: string; text: string; at: number };

export type RoomView = RoomSettings & {
  code: string;
  status: "lobby" | "playing" | "finished" | "abandoned";
  hostId: string;
  you: string;
  players: PlayerView[];
  game: GameView | null;
  /** Imposter or Night Village, when one of those is running. */
  party: PartyView | null;
  log: LogLine[];
  chat: ChatLine[];
  /** Reactions from the last few seconds. */
  reactions: Reaction[];
};

export type ClientMsg =
  | { t: "lobby" }
  | { t: "create"; settings: Partial<RoomSettings> }
  | { t: "join"; code: string }
  | { t: "leave" }
  | { t: "end" }
  | { t: "settings"; settings: Partial<RoomSettings> }
  | { t: "addBot" }
  | { t: "kick"; id: string }
  | { t: "start" }
  | { t: "next" }
  | { t: "act"; action: Action }
  | { t: "party"; action: PartyAction }
  | { t: "chat"; text: string }
  | { t: "react"; text: string }
  | { t: "avatar"; id: string };

export type ServerMsg =
  | { t: "welcome"; you: { id: string; name: string }; activeRoom: string | null }
  | { t: "rooms"; rooms: RoomSummary[] }
  | { t: "joined"; code: string }
  | { t: "left" }
  | { t: "state"; room: RoomView }
  | { t: "error"; message: string };
