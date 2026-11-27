// One entry point for the party games, so the room code doesn't care which one is running.
import type { GameEvent } from "./engine.ts";
import * as draw from "./draw.ts";
import * as imposter from "./imposter.ts";
import type { BotMove } from "./party-core.ts";
import type { PartyAction, PartyKind, PartyOpts, PartyView } from "./party-meta.ts";
import * as village from "./village.ts";

export type PartyState = imposter.ImposterState | village.VillageState | draw.DrawState;
type Players = { id: string; name: string; bot: boolean }[];

// Each engine takes its own state type; the kind on the state picks the matching engine.
type Engine = {
  create(p: Players, o: PartyOpts): PartyState;
  start(s: PartyState, now: number): GameEvent[];
  act(s: PartyState, seat: number, a: PartyAction, now: number): GameEvent[];
  timeout(s: PartyState, now: number): GameEvent[];
  botStep(s: PartyState, now: number): BotMove | null;
  view(s: PartyState, uid: string): PartyView;
};
const ENGINES = { imposter, village, draw } as unknown as Record<PartyKind, Engine>;
const of = (s: PartyState) => ENGINES[s.kind];

export const createParty = (kind: PartyKind, players: Players, opts: PartyOpts) => ENGINES[kind].create(players, opts);
export const startParty = (s: PartyState, now = Date.now()) => of(s).start(s, now);
export const actParty = (s: PartyState, seat: number, a: PartyAction, now = Date.now()) => of(s).act(s, seat, a, now);
export const timeoutParty = (s: PartyState, now = Date.now()) => of(s).timeout(s, now);
export const botParty = (s: PartyState, now = Date.now()) => of(s).botStep(s, now);
export const viewParty = (s: PartyState, uid: string) => of(s).view(s, uid);
