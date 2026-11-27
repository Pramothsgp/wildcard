// Live rooms. Memory is the source of truth while the process runs; every change is written
// to Postgres before players see it, and rooms are reloaded from Postgres on start.
// ponytail: single process (Cloud Run maxScale 1). More instances need shared state first.
import { randomInt } from "node:crypto";
import type { WebSocket } from "ws";
import { botAction } from "./bots.ts";
import { cleanAction, cleanPartyAction, cleanSettings } from "./clean.ts";
import { GameError, type GameEvent, type GameState, act, createGame, startRound } from "./engine.ts";
import { MODES, ruleChanges } from "./modes.ts";
import { type PartyState, actParty, botParty, createParty, startParty, timeoutParty } from "./party.ts";
import { DEFAULT_PARTY, GAMES } from "./party-meta.ts";
import { AVATARS, REACTIONS, REACTION_MS } from "./help.ts";
import type { Action, ChatLine, ClientMsg, LogLine, Reaction, RoomSettings, RoomSummary, RoomView, ServerMsg } from "./protocol.ts";
import * as store from "./store.ts";
import { viewFor } from "./view.ts";
import { THEMES, botName } from "./themes.ts";

type Member = { id: string; name: string; bot: boolean; left?: boolean; avatar?: string };
type Status = RoomView["status"];
/** `game` is a Wildcard game, `party` an Imposter or Night Village game. At most one is set. */
export type Saved = { settings: RoomSettings; hostId: string; members: Member[]; game: GameState | null; party?: PartyState | null; seq: number; log: LogLine[]; chat: ChatLine[] };
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
      const settings = cleanSettings(m.settings, { kind: "wildcard", name: `${c.user.name}'s table`, mode: "classic", isPublic: true, maxPlayers: 6, rules: MODES.classic.rules, partyRules: DEFAULT_PARTY, theme: "classic" });
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
    case "end": {
      // The host can end the table. If the host has gone offline (closed the tab without leaving),
      // anyone at the table can, so it doesn't stay open forever.
      need(isHost || !connected(room, room.s.hostId), "Only the host can end the game");
      need(room.status === "lobby" || room.status === "playing", "This game is already over");
      room.status = "abandoned";
      return commit(room, [{ kind: "end", text: `${c.user.name} ended the game`, seat: -1 }], uid);
    }
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
      // The game is fixed when the table opens: it is part of the table's URL.
      room.s.settings = { ...cleanSettings(m.settings, room.s.settings), kind: room.s.settings.kind ?? "wildcard" };
      need(room.s.members.length <= room.s.settings.maxPlayers, "More players seated than that");
      // Bots take names from the theme, so a new theme renames them.
      if (room.s.settings.theme !== prevTheme) room.s.members.filter((x) => x.bot).forEach((b, i) => (b.name = botName(room.s.settings.theme, i)));
      const { kind, mode, rules, theme } = room.s.settings;
      const extra = ruleChanges(mode, rules);
      const what = (kind ?? "wildcard") === "wildcard" ? `${MODES[mode].name}${extra.length ? `, ${extra.join(", ")}` : ""}` : GAMES[kind].name;
      const text = `Rules: ${what} · ${THEMES[theme].name} theme`;
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
      if (dealNext(room, uid)) return;
      need(room.status === "lobby", "Already started");
      const kind = room.s.settings.kind ?? "wildcard";
      need(room.s.members.length >= GAMES[kind].min, `${GAMES[kind].name} needs at least ${GAMES[kind].min} players. Add a bot?`);
      if (kind !== "wildcard") {
        const p = (room.s.party = createParty(kind, room.s.members.map(({ id, name, bot }) => ({ id, name, bot })), room.s.settings.partyRules ?? DEFAULT_PARTY));
        room.status = "playing";
        return playParty(room, uid, () => [{ kind: "start", text: `Game on: ${GAMES[kind].name}`, seat: -1 }, ...startParty(p)]);
      }
      room.s.game = createGame(room.s.settings.rules, room.s.members.map(({ id, name, bot }) => ({ id, name, bot })));
      room.status = "playing";
      return commit(room, [{ kind: "start", text: `Game on: ${MODES[room.s.settings.mode].name}`, seat: -1 }, ...startRound(room.s.game)], uid);
    }
    case "next": {
      need(isHost, "Only the host can do that");
      if (dealNext(room, uid)) return;
      need(room.status === "finished", "Game still running");
      room.s.members = room.s.members.filter((x) => !x.left);
      room.s.game = null;
      room.s.party = null;
      room.status = "lobby";
      return commit(room, [{ kind: "rematch", text: "Back to the lobby for a rematch", seat: -1 }], uid);
    }
    case "act": {
      need(room.status === "playing" && room.s.game, "No game running");
      const seat = room.s.game!.seats.findIndex((p) => p.id === uid);
      need(seat >= 0, "You are not seated in this game");
      return play(room, seat, cleanAction(m.action));
    }
    case "party": {
      const p = room.s.party;
      need(room.status === "playing" && p, "No game running");
      const seat = p!.players.findIndex((x) => x.id === uid);
      need(seat >= 0, "You are not seated in this game");
      const action = cleanPartyAction(m.action);
      return playParty(room, uid, () => actParty(p!, seat, action));
    }
  }
}

/** Host skips the wait between rounds. True if a round was dealt. */
function dealNext(room: Room, uid: string): boolean {
  if (room.status !== "playing") return false;
  if (room.s.game?.phase === "roundOver") nextRound(room, uid);
  else if (room.s.party?.phase === "reveal") playParty(room, uid, () => startParty(room.s.party!));
  else return false;
  return true;
}

/** Run a party-game step, then record round and match results like Wildcard does. */
function playParty(room: Room, actorId: string, step: () => GameEvent[]) {
  const p = room.s.party!;
  const events = step();
  const results: store.ResultRow[] = [];
  const human = (i: number) => !p.players[i].bot;
  if (events.some((e) => e.kind === "roundOver")) {
    p.gained.forEach((points, i) => points > 0 && human(i) && results.push({ roomCode: room.code, round: p.round, userId: p.players[i].id, points, won: true }));
  }
  if (events.some((e) => e.kind === "matchOver")) {
    room.status = "finished";
    p.players.forEach((x, i) => human(i) && results.push({ roomCode: room.code, round: 0, userId: x.id, points: i === p.champ ? 100 : 0, won: i === p.champ }));
  }
  commit(room, events, actorId, results);
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
  const seats = g?.seats ?? room.s.party?.players;
  const rows: store.EventRow[] = events.map((e) => ({
    roomCode: room.code,
    seq: ++room.s.seq,
    round: g?.round ?? room.s.party?.round ?? 0,
    actorId: e.seat !== undefined && e.seat >= 0 && seats?.[e.seat] ? seats[e.seat].id : actorId,
    kind: e.kind,
    text: e.text,
    data: e.data ?? null,
  }));
  const now = Date.now();
  room.s.log = [...room.s.log, ...rows.filter((_, i) => !events[i].hidden).map((r) => ({ seq: r.seq, text: r.text, at: now, kind: r.kind }))].slice(-60);
  if (!humansLeft(room) && (room.status === "lobby" || room.status === "playing")) room.status = "abandoned";
  const s = room.s;
  const row: store.RoomRow = {
    // Party games store their kind as the mode, so history can name them.
    code: room.code, name: s.settings.name, hostId: s.hostId, mode: (s.settings.kind ?? "wildcard") === "wildcard" ? s.settings.mode : s.settings.kind, isPublic: s.settings.isPublic,
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
  if (room.s.party) return scheduleParty(room, room.s.party);
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

/** Party games: the next bot move or the phase clock, whichever comes first. */
function scheduleParty(room: Room, p: PartyState) {
  if (room.status !== "playing" || !humansOnline(room) || p.phase === "over") return;
  const now = Date.now();
  room.deadline = p.ends;
  let delay = p.ends === null ? null : Math.max(0, p.ends - now);
  // Nobody waits out the full clock for a clue from someone who has gone.
  if (p.kind === "imposter" && p.phase === "clues" && !p.players[p.turn].bot && !connected(room, p.players[p.turn].id)) delay = Math.min(delay ?? 3000, 3000);
  const bot = botParty(p, now);
  const botDelay = bot ? Math.max(800 + randomInt(700), bot.at - now) : null;
  if (bot && botDelay !== null && (delay === null || botDelay < delay)) {
    room.timer = setTimeout(() => safely(room, () => playParty(room, p.players[bot.seat].id, () => actParty(p, bot.seat, bot.action))), botDelay);
  } else if (delay !== null) {
    room.timer = setTimeout(() => safely(room, () => playParty(room, "system", () => timeoutParty(p))), delay);
  }
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
    const view = viewFor(room, uid, (id) => connected(room, id));
    for (const c of set) send(c, { t: "state", room: view });
  }
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
      code: r.code, name: r.s.settings.name, kind: r.s.settings.kind ?? "wildcard", mode: r.s.settings.mode, status: r.status as "lobby" | "playing",
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

const logErr = (err: unknown) => console.error("rooms: db write failed", err);
