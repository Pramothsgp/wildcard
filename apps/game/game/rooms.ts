// Live rooms. Memory is the source of truth while the process runs; every change is written
// to Postgres before players see it, and rooms are reloaded from Postgres on start.
// ponytail: single process (Cloud Run maxScale 1). More instances need shared state first.
import { randomInt } from "node:crypto";
import type { WebSocket } from "ws";
import { type Color, DARK_COLORS, LIGHT_COLORS, face } from "./cards.ts";
import { botAction } from "./bots.ts";
import { GameError, type GameEvent, type GameState, act, canPlay, createGame, startRound, topFace } from "./engine.ts";
import { MODES, isModeId, ruleChanges, sanitizeRules } from "./modes.ts";
import { AVATARS, REACTIONS, REACTION_MS } from "./help.ts";
import type { Action, ChatLine, ClientMsg, LogLine, Reaction, RoomSettings, RoomSummary, RoomView, ServerMsg } from "./protocol.ts";
import * as store from "./store.ts";
import { THEMES, botName, isThemeId } from "./themes.ts";

type Member = { id: string; name: string; bot: boolean; left?: boolean; avatar?: string };
type Status = RoomView["status"];
type Saved = { settings: RoomSettings; hostId: string; members: Member[]; game: GameState | null; seq: number; log: LogLine[]; chat: ChatLine[] };
export type Conn = { ws: WebSocket; user: { id: string; name: string }; room: string | null; lobby: boolean; tokens: number; lastChat: number; lastReact: number };

// No constructor parameter properties: the server runs on Node's type stripping.
class Room {
  sockets = new Map<string, Set<Conn>>();
  timer: NodeJS.Timeout | undefined;
  deadline: number | null = null;
  queue: Promise<void> = Promise.resolve();
  /** Recent reactions. Memory only: they are gone in seconds, so not worth saving. */
  reactions: Reaction[] = [];
  code: string;
  status: Status;
  s: Saved;
  constructor(code: string, status: Status, s: Saved) {
    this.code = code;
    this.status = status;
    this.s = s;
  }
}

const rooms = new Map<string, Room>();
const conns = new Set<Conn>();
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const send = (c: Conn, m: ServerMsg) => c.ws.readyState === 1 && c.ws.send(JSON.stringify(m));
const connected = (r: Room, id: string) => (r.sockets.get(id)?.size ?? 0) > 0;
const humansOnline = (r: Room) => r.s.members.some((m) => !m.bot && !m.left && connected(r, m.id));

export async function init() {
  for (const row of await store.loadLiveRooms()) {
    const r = new Room(row.code, row.status as Status, row.state as Saved);
    rooms.set(r.code, r);
    schedule(r);
  }
  console.log(`rooms: restored ${rooms.size} live rooms`);
}

export function connect(ws: WebSocket, user: { id: string; name: string }) {
  const c: Conn = { ws, user, room: null, lobby: false, tokens: 20, lastChat: 0, lastReact: 0 };
  conns.add(c);
  const live = liveRoomOf(user.id);
  send(c, { t: "welcome", you: user, activeRoom: live?.code ?? null });
  ws.on("message", (raw) => {
    // ponytail: token bucket per socket, refilled by a shared 1s interval below.
    if (c.tokens-- <= 0) return send(c, { t: "error", message: "Slow down" });
    let msg: ClientMsg;
    try {
      msg = JSON.parse(String(raw));
    } catch {
      return;
    }
    try {
      handle(c, msg);
    } catch (err) {
      if (err instanceof GameError) send(c, { t: "error", message: err.message });
      else {
        console.error("rooms: handler failed", err);
        send(c, { t: "error", message: "Something went wrong" });
      }
    }
  });
  ws.on("close", () => {
    conns.delete(c);
    detach(c);
  });
}
setInterval(() => { for (const c of conns) c.tokens = Math.min(20, c.tokens + 10); }, 1000).unref();

const liveRoomOf = (userId: string) =>
  [...rooms.values()].find((r) => (r.status === "lobby" || r.status === "playing") && r.s.members.some((m) => m.id === userId && !m.left));

function handle(c: Conn, m: ClientMsg) {
  if (!m || typeof m !== "object" || typeof m.t !== "string") return;
  const r = c.room ? rooms.get(c.room) : undefined;
  const uid = c.user.id;
  const isHost = r?.s.hostId === uid;

  switch (m.t) {
    case "lobby":
      c.lobby = true;
      return send(c, { t: "rooms", rooms: summaries() });
    case "create": {
      leaveLobbyRoom(uid);
      need(!liveRoomOf(uid), "Finish or leave your current game first");
      const code = newCode();
      const settings = cleanSettings(m.settings, { name: `${c.user.name}'s table`, mode: "classic", isPublic: true, maxPlayers: 6, rules: MODES.classic.rules, theme: "classic" });
      const room = new Room(code, "lobby", { settings, hostId: uid, members: [{ id: uid, name: c.user.name, bot: false }], game: null, seq: 0, log: [], chat: [] });
      rooms.set(code, room);
      attach(c, room);
      void store.memberJoined(code, uid).catch(logErr);
      return commit(room, [{ kind: "create", text: `${c.user.name} opened the table`, seat: -1 }], uid);
    }
    case "join": {
      const room = rooms.get(String(m.code ?? "").toUpperCase().trim());
      need(room, "No open table with that code");
      const member = room!.s.members.find((x) => x.id === uid);
      if (!member) {
        need(room!.status === "lobby", "That game has already started");
        need(room!.s.members.length < room!.s.settings.maxPlayers, "That table is full");
        leaveLobbyRoom(uid);
        need(!liveRoomOf(uid), "Finish or leave your current game first");
        room!.s.members.push({ id: uid, name: c.user.name, bot: false });
        void store.memberJoined(room!.code, uid).catch(logErr);
        attach(c, room!);
        return commit(room!, [{ kind: "join", text: `${c.user.name} joined`, seat: -1 }], uid);
      }
      const wasAway = member.left || seatOf(room!, uid)?.auto;
      member.left = false;
      const seat = seatOf(room!, uid);
      if (seat) seat.auto = false;
      attach(c, room!);
      if (wasAway) {
        void store.memberJoined(room!.code, uid).catch(logErr);
        return commit(room!, [{ kind: "rejoin", text: `${c.user.name} is back`, seat: -1 }], uid);
      }
      broadcast(room!);
      return schedule(room!);
    }
  }

  need(r, "Join a table first");
  const room = r!;
  switch (m.t) {
    case "leave":
      return leave(room, c.user);
    case "chat": {
      const text = String(m.text ?? "").trim().slice(0, 200);
      if (!text || Date.now() - c.lastChat < 700) return;
      c.lastChat = Date.now();
      room.s.chat = [...room.s.chat, { id: uid, name: c.user.name, text, at: Date.now() }].slice(-50);
      return commit(room, [{ kind: "chat", text: `${c.user.name}: ${text}`, seat: -1, hidden: true }], uid);
    }
    case "react": {
      const text = String(m.text ?? "");
      if (!(REACTIONS as readonly string[]).includes(text) || Date.now() - c.lastReact < 1000) return;
      c.lastReact = Date.now();
      room.reactions = [...room.reactions.filter((x) => Date.now() - x.at < REACTION_MS), { id: uid, text, at: Date.now() }].slice(-20);
      broadcast(room);
      // One more push once it has expired, so it disappears for everyone.
      setTimeout(() => broadcast(room), REACTION_MS + 50).unref();
      return;
    }
    case "avatar": {
      const member = room.s.members.find((x) => x.id === uid);
      need(member && (AVATARS as readonly string[]).includes(String(m.id)), "Unknown avatar");
      member!.avatar = String(m.id);
      return commit(room, [], uid);
    }
    case "settings": {
      need(isHost && room.status === "lobby", "Only the host can change settings before the start");
      const prevTheme = room.s.settings.theme;
      room.s.settings = cleanSettings(m.settings, room.s.settings);
      need(room.s.members.length <= room.s.settings.maxPlayers, "More players seated than that");
      // Bots take names from the theme, so a new theme renames them.
      if (room.s.settings.theme !== prevTheme) room.s.members.filter((x) => x.bot).forEach((b, i) => (b.name = botName(room.s.settings.theme, i)));
      const extra = ruleChanges(room.s.settings.mode, room.s.settings.rules);
      const text = `Rules: ${MODES[room.s.settings.mode].name}${extra.length ? `, ${extra.join(", ")}` : ""} · ${THEMES[room.s.settings.theme].name} cards`;
      return commit(room, [{ kind: "settings", text, seat: -1 }], uid);
    }
    case "addBot": {
      need(isHost && room.status === "lobby", "Only the host can add bots");
      need(room.s.members.length < room.s.settings.maxPlayers, "Table is full");
      const used = new Set(room.s.members.map((x) => x.name));
      const theme = room.s.settings.theme;
      let n = 0;
      while (used.has(botName(theme, n))) n++;
      const name = botName(theme, n);
      room.s.members.push({ id: `bot-${randomInt(1e9)}`, name, bot: true, avatar: `hero${room.s.members.filter((x) => x.bot).length % 10}` });
      return commit(room, [{ kind: "join", text: `${name} sat down`, seat: -1 }], uid);
    }
    case "kick": {
      need(isHost && room.status === "lobby" && m.id !== uid, "Only the host can remove players in the lobby");
      const gone = room.s.members.find((x) => x.id === m.id);
      need(gone, "No such player");
      room.s.members = room.s.members.filter((x) => x !== gone);
      if (!gone!.bot) void store.memberLeft(room.code, gone!.id).catch(logErr);
      for (const k of room.sockets.get(gone!.id) ?? []) { detach(k); send(k, { t: "left" }); }
      return commit(room, [{ kind: "kick", text: `${gone!.name} was removed`, seat: -1 }], uid);
    }
    case "start": {
      need(isHost, "Only the host can start");
      if (room.status === "playing" && room.s.game?.phase === "roundOver") return nextRound(room, uid);
      need(room.status === "lobby", "Already started");
      need(room.s.members.length >= 2, "Need at least 2 players. Add a bot?");
      room.s.game = createGame(room.s.settings.rules, room.s.members.map(({ id, name, bot }) => ({ id, name, bot })));
      room.status = "playing";
      return commit(room, [{ kind: "start", text: `Game on: ${MODES[room.s.settings.mode].name}`, seat: -1 }, ...startRound(room.s.game)], uid);
    }
    case "next": {
      need(isHost, "Only the host can do that");
      if (room.s.game?.phase === "roundOver") return nextRound(room, uid);
      need(room.status === "finished", "Game still running");
      room.s.members = room.s.members.filter((x) => !x.left);
      room.s.game = null;
      room.status = "lobby";
      return commit(room, [{ kind: "rematch", text: "Back to the lobby for a rematch", seat: -1 }], uid);
    }
    case "act": {
      need(room.status === "playing" && room.s.game, "No game running");
      const seat = room.s.game!.seats.findIndex((p) => p.id === uid);
      need(seat >= 0, "You are not seated in this game");
      return play(room, seat, cleanAction(m.action));
    }
  }
}

function need(cond: unknown, msg: string) {
  if (!cond) throw new GameError(msg);
}

function play(room: Room, seat: number, action: Action) {
  const g = room.s.game!;
  const events = act(g, seat, action);
  const results: store.ResultRow[] = [];
  for (const e of events) {
    const winner = e.seat !== undefined ? g.seats[e.seat] : undefined;
    if (e.kind === "roundOver" && winner && !winner.bot) {
      results.push({ roomCode: room.code, round: g.round, userId: winner.id, points: g.lastRoundPoints, won: true });
    }
    if (e.kind === "matchOver") {
      room.status = "finished";
      for (const p of g.seats) {
        if (!p.bot) results.push({ roomCode: room.code, round: 0, userId: p.id, points: p === winner ? 100 : 0, won: p === winner });
      }
    }
  }
  commit(room, events, g.seats[seat].id, results);
}

function nextRound(room: Room, actor: string) {
  commit(room, startRound(room.s.game!), actor);
}

type Ev = GameEvent & { hidden?: boolean };

/** Record events, save, then show everyone the new state. */
function commit(room: Room, events: Ev[], actorId: string, results: store.ResultRow[] = []) {
  const g = room.s.game;
  const rows: store.EventRow[] = events.map((e) => ({
    roomCode: room.code,
    seq: ++room.s.seq,
    round: g?.round ?? 0,
    actorId: e.seat !== undefined && e.seat >= 0 && g ? g.seats[e.seat].id : actorId,
    kind: e.kind,
    text: e.text,
    data: e.data ?? null,
  }));
  const now = Date.now();
  room.s.log = [...room.s.log, ...rows.filter((_, i) => !events[i].hidden).map((r) => ({ seq: r.seq, text: r.text, at: now, kind: r.kind }))].slice(-60);
  if (!humansLeft(room) && (room.status === "lobby" || room.status === "playing")) room.status = "abandoned";
  const s = room.s;
  const row: store.RoomRow = {
    code: room.code, name: s.settings.name, hostId: s.hostId, mode: s.settings.mode, isPublic: s.settings.isPublic,
    status: room.status, state: JSON.parse(JSON.stringify(s)),
    finishedAt: room.status === "finished" || room.status === "abandoned" ? new Date() : null,
  };
  schedule(room);
  room.queue = room.queue
    .then(() => store.persist(row, rows, results))
    // ponytail: after retries we keep playing from memory; the next save writes the full snapshot again.
    .catch((err) => console.error(`rooms: save failed for ${room.code}`, err))
    .then(() => {
      broadcast(room);
      lobbyChanged();
      if (room.status === "abandoned" || room.status === "finished") setTimeout(() => evict(room), 10 * 60_000).unref();
    });
}

const humansLeft = (r: Room) => r.s.members.some((m) => !m.bot && !m.left);

function evict(room: Room) {
  if (room.status !== "finished" && room.status !== "abandoned") return;
  clearTimeout(room.timer);
  for (const set of room.sockets.values()) for (const c of set) c.room = null;
  rooms.delete(room.code);
}

/** Bots, absent players and the turn clock. */
function schedule(room: Room) {
  clearTimeout(room.timer);
  room.deadline = null;
  const g = room.s.game;
  if (room.status !== "playing" || !g || !humansOnline(room)) return;
  if (g.phase === "roundOver") {
    room.deadline = Date.now() + 10_000;
    room.timer = setTimeout(() => safely(room, () => nextRound(room, "system")), 10_000);
    return;
  }
  if (g.phase !== "playing") return;
  const p = g.seats[g.turn];
  const human = !p.bot && !p.auto;
  const delay = p.bot ? 800 + randomInt(700) : p.auto ? 1200 : g.rules.turnSeconds * 1000;
  if (human) room.deadline = Date.now() + delay;
  room.timer = setTimeout(() => safely(room, () => {
    if (human && !connected(room, p.id)) p.auto = true;
    const seat = g.turn;
    try {
      play(room, seat, botAction(g, seat, p.bot ? (g.rules.botLevel ?? "normal") : "autopilot"));
    } catch (err) {
      if (!(err instanceof GameError)) throw err;
      play(room, seat, g.drawn !== null ? { type: "pass" } : { type: "draw" });
    }
  }), delay);
}

function safely(room: Room, fn: () => void) {
  try {
    fn();
  } catch (err) {
    console.error(`rooms: timer failed in ${room.code}`, err);
  }
}

function leave(room: Room, user: { id: string; name: string }) {
  const uid = user.id;
  const member = room.s.members.find((m) => m.id === uid);
  for (const k of room.sockets.get(uid) ?? []) { detach(k); send(k, { t: "left" }); }
  if (!member || room.status === "finished" || room.status === "abandoned") return;
  void store.memberLeft(room.code, uid).catch(logErr);
  if (room.status === "lobby") {
    room.s.members = room.s.members.filter((m) => m !== member);
  } else {
    member.left = true;
    const seat = seatOf(room, uid);
    if (seat) seat.auto = true;
  }
  if (room.s.hostId === uid) room.s.hostId = room.s.members.find((m) => !m.bot && !m.left)?.id ?? uid;
  commit(room, [{ kind: "leave", text: `${user.name} left${room.status === "playing" ? " (autopilot takes over)" : ""}`, seat: -1 }], uid);
}

/** Leaving one lobby to join another is fine; leaving a running game is not done silently. */
function leaveLobbyRoom(uid: string) {
  const r = liveRoomOf(uid);
  if (r?.status === "lobby") leave(r, r.s.members.find((m) => m.id === uid)!);
}

function attach(c: Conn, room: Room) {
  if (c.room && c.room !== room.code) detach(c);
  c.room = room.code;
  const set = room.sockets.get(c.user.id) ?? new Set();
  set.add(c);
  room.sockets.set(c.user.id, set);
  send(c, { t: "joined", code: room.code });
}

function detach(c: Conn) {
  const room = c.room ? rooms.get(c.room) : undefined;
  c.room = null;
  if (!room) return;
  room.sockets.get(c.user.id)?.delete(c);
  broadcast(room);
  schedule(room);
}

const seatOf = (r: Room, uid: string) => r.s.game?.seats.find((p) => p.id === uid);

function broadcast(room: Room) {
  for (const [uid, set] of room.sockets) {
    if (!set.size) continue;
    const view = viewFor(room, uid);
    for (const c of set) send(c, { t: "state", room: view });
  }
}

export function viewFor(room: Room, uid: string): RoomView {
  const { settings, game: g, hostId, members, log, chat } = room.s;
  const avatarOf = (id: string) => members.find((m) => m.id === id)?.avatar ?? null;
  const other = g?.side === "dark" ? "light" : "dark";
  // Players who are done (playing on) watch with every hand face up.
  const watching = g?.phase === "playing" && !!g.seats.find((p) => p.id === uid)?.place;
  const players = g
    ? g.seats.map((p) => ({
        id: p.id, name: p.name, bot: p.bot, auto: p.auto, connected: p.bot || connected(room, p.id),
        count: p.hand.length, score: p.score, calledUno: p.calledUno, out: p.out,
        backs: g.rules.deck === "flip" && p.id !== uid ? p.hand.map((c) => face(c, other)) : null,
        place: p.place ?? null,
        reveal: watching && p.id !== uid ? p.hand.map((c) => face(c, g.side)) : null,
        avatar: avatarOf(p.id),
      }))
    : members.map((m) => ({ id: m.id, name: m.name, bot: m.bot, auto: false, connected: m.bot || connected(room, m.id), count: 0, score: 0, calledUno: false, out: false, backs: null, place: null, reveal: null, avatar: m.avatar ?? null }));
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
  return { ...settings, theme: settings.theme ?? "classic", code: room.code, status: room.status, hostId, you: uid, players, game, log, chat, reactions };
}

let lobbyTimer: NodeJS.Timeout | undefined;
function lobbyChanged() {
  if (lobbyTimer) return;
  lobbyTimer = setTimeout(() => {
    lobbyTimer = undefined;
    const list = summaries();
    for (const c of conns) if (c.lobby) send(c, { t: "rooms", rooms: list });
  }, 300);
}

function summaries(): RoomSummary[] {
  return [...rooms.values()]
    .filter((r) => r.s.settings.isPublic && (r.status === "lobby" || r.status === "playing"))
    .map((r) => ({
      code: r.code, name: r.s.settings.name, mode: r.s.settings.mode, status: r.status as "lobby" | "playing",
      players: r.s.members.filter((m) => !m.left).length, maxPlayers: r.s.settings.maxPlayers,
      host: r.s.members.find((m) => m.id === r.s.hostId)?.name ?? "",
    }))
    .toSorted((a, b) => Number(a.status === "playing") - Number(b.status === "playing"))
    .slice(0, 100);
}

function newCode(): string {
  for (;;) {
    const code = Array.from({ length: 5 }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join("");
    // ponytail: in-memory check only; finished rooms in the DB could collide (32^5 codes, rare). The upsert would then reuse the row.
    if (!rooms.has(code)) return code;
  }
}

function cleanSettings(input: Partial<RoomSettings> | undefined, prev: RoomSettings): RoomSettings {
  const i = input && typeof input === "object" ? input : {};
  const mode = isModeId(i.mode) ? i.mode : prev.mode;
  const name = typeof i.name === "string" && i.name.trim() ? i.name.trim().slice(0, 40) : prev.name;
  const maxPlayers = typeof i.maxPlayers === "number" ? Math.min(10, Math.max(2, Math.round(i.maxPlayers))) : prev.maxPlayers;
  const rules = sanitizeRules(mode, i.rules ?? (mode === prev.mode ? prev.rules : undefined));
  const theme = isThemeId(i.theme) ? i.theme : prev.theme ?? "classic";
  return { name, mode, rules, maxPlayers, theme, isPublic: typeof i.isPublic === "boolean" ? i.isPublic : prev.isPublic };
}

const COLORS = new Set<string>([...LIGHT_COLORS, ...DARK_COLORS]);
function cleanAction(a: unknown): Action {
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

const logErr = (err: unknown) => console.error("rooms: db write failed", err);
