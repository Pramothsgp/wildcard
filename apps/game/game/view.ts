// What one player sees of a room: their own hand, everyone else's counts, and nothing secret.
import { face } from "./cards.ts";
import { canPlay, topFace } from "./engine.ts";
import { REACTION_MS } from "./help.ts";
import { viewParty } from "./party.ts";
import { DEFAULT_PARTY } from "./party-meta.ts";
import type { Reaction, RoomView } from "./protocol.ts";
import type { Saved } from "./rooms.ts";
import { isThemeId } from "./themes.ts";

type ViewRoom = { code: string; status: RoomView["status"]; s: Saved; deadline: number | null; reactions: Reaction[] };

export function viewFor(room: ViewRoom, uid: string, connected: (id: string) => boolean): RoomView {
  const { settings, game: g, hostId, members, log, chat } = room.s;
  const party = room.s.party ?? null;
  const avatarOf = (id: string) => members.find((m) => m.id === id)?.avatar ?? null;
  const other = g?.side === "dark" ? "light" : "dark";
  // Players who are done (playing on) watch with every hand face up.
  const watching = g?.phase === "playing" && !!g.seats.find((p) => p.id === uid)?.place;
  const players = g
    ? g.seats.map((p) => ({
        id: p.id, name: p.name, bot: p.bot, auto: p.auto, connected: p.bot || connected(p.id),
        count: p.hand.length, score: p.score, calledUno: p.calledUno, out: p.out,
        backs: g.rules.deck === "flip" && p.id !== uid ? p.hand.map((c) => face(c, other)) : null,
        place: p.place ?? null,
        reveal: watching && p.id !== uid ? p.hand.map((c) => face(c, g.side)) : null,
        avatar: avatarOf(p.id),
      }))
    : party
    ? party.players.map((p, i) => ({
        id: p.id, name: p.name, bot: p.bot, auto: false, connected: p.bot || connected(p.id), count: 0, score: p.score,
        calledUno: false, out: party.kind === "village" && party.alive[i] === false, backs: null, place: null, reveal: null, avatar: avatarOf(p.id),
      }))
    : members.map((m) => ({ id: m.id, name: m.name, bot: m.bot, auto: false, connected: m.bot || connected(m.id), count: 0, score: 0, calledUno: false, out: false, backs: null, place: null, reveal: null, avatar: m.avatar ?? null }));
  let game: RoomView["game"] = null;
  if (g) {
    const mine = g.seats.findIndex((p) => p.id === uid);
    const hand = mine >= 0 ? g.seats[mine].hand : [];
    const top = topFace(g);
    const playable = g.phase !== "playing" || mine < 0 ? [] : hand.filter((c) => {
      if (g.turn === mine) return canPlay(g, c) && (g.drawn === null || c.id === g.drawn);
      const f = face(c, g.side);
      return g.rules.jumpIn && !g.pendingDraw && f.color !== "wild" && f.color === top.color && f.value === top.value;
    }).map((c) => c.id);
    game = {
      phase: g.phase, round: g.round, side: g.side, color: g.color, direction: g.direction,
      turn: g.seats[g.turn].id, pendingDraw: g.pendingDraw,
      canChallenge: g.challenge !== null && g.turn === mine,
      drawn: g.turn === mine ? g.drawn : null,
      unoTarget: g.unoTarget === null ? null : g.seats[g.unoTarget].id,
      pile: g.discard.slice(-8).map((c) => ({ id: c.id, face: face(c, g.side) })),
      drawCount: g.drawPile.length,
      hand: hand.map((c) => ({ id: c.id, face: face(c, g.side) })),
      playable,
      roundWinner: g.roundWinner === null ? null : g.seats[g.roundWinner].id,
      lastRoundPoints: g.lastRoundPoints,
      deadline: room.deadline,
    };
  }
  const reactions = room.reactions.filter((x) => Date.now() - x.at < REACTION_MS);
  // Older saved tables can name a theme that no longer exists (e.g. "chola" before Moovendar).
  return {
    ...settings, kind: settings.kind ?? "wildcard", partyRules: settings.partyRules ?? DEFAULT_PARTY, theme: isThemeId(settings.theme) ? settings.theme : "classic",
    code: room.code, status: room.status, hostId, you: uid, players, game, party: party && viewParty(party, uid), log, chat, reactions,
  };
}

