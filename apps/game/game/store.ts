// Postgres reads and writes for rooms, logs and results.
import { db } from "@repo/data";
import { gameEvent, result, room, roomMember, user } from "@repo/data/schema";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";

export type RoomRow = typeof room.$inferInsert;
export type EventRow = Omit<typeof gameEvent.$inferInsert, "id" | "createdAt">;
export type ResultRow = Omit<typeof result.$inferInsert, "id" | "createdAt">;

async function retry<T>(fn: () => Promise<T>, tries = 4): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i >= tries - 1) throw err;
      await new Promise((r) => setTimeout(r, 200 * 2 ** i));
    }
  }
}

/** Snapshot + new events + results in one transaction, so the log never disagrees with the state. */
export function persist(row: RoomRow, events: EventRow[], results: ResultRow[] = []) {
  return retry(() =>
    db.transaction(async (tx) => {
      await tx
        .insert(room)
        .values(row)
        .onConflictDoUpdate({
          target: room.code,
          set: {
            name: row.name, hostId: row.hostId, mode: row.mode, isPublic: row.isPublic,
            status: row.status, state: row.state, updatedAt: new Date(), finishedAt: row.finishedAt,
          },
        });
      if (events.length) await tx.insert(gameEvent).values(events);
      if (results.length) await tx.insert(result).values(results);
    }),
  );
}

export function memberJoined(code: string, userId: string) {
  return retry(() =>
    db.insert(roomMember).values({ roomCode: code, userId })
      .onConflictDoUpdate({ target: [roomMember.roomCode, roomMember.userId], set: { leftAt: null } }),
  );
}

export function memberLeft(code: string, userId: string) {
  return retry(() =>
    db.update(roomMember).set({ leftAt: new Date() })
      .where(and(eq(roomMember.roomCode, code), eq(roomMember.userId, userId))),
  );
}

export function loadLiveRooms() {
  return db.select().from(room).where(inArray(room.status, ["lobby", "playing"])).limit(1000);
}

export async function codeTaken(code: string) {
  const rows = await db.select({ code: room.code }).from(room).where(eq(room.code, code)).limit(1);
  return rows.length > 0;
}

/** The room a user is still seated in, if any: lets them get back after closing the tab. */
export async function liveRoomFor(userId: string) {
  const rows = await db
    .select({ code: room.code, name: room.name, status: room.status })
    .from(roomMember)
    .innerJoin(room, eq(room.code, roomMember.roomCode))
    .where(and(eq(roomMember.userId, userId), isNull(roomMember.leftAt), inArray(room.status, ["lobby", "playing"])))
    .orderBy(desc(room.updatedAt))
    .limit(1);
  return rows[0] ?? null;
}

export function leaderboard(limit = 50) {
  return db
    .select({
      userId: result.userId,
      name: user.name,
      points: sql<number>`sum(${result.points})::int`,
      matchesWon: sql<number>`count(*) filter (where ${result.round} = 0 and ${result.won})::int`,
      matches: sql<number>`count(*) filter (where ${result.round} = 0)::int`,
      roundsWon: sql<number>`count(*) filter (where ${result.round} > 0 and ${result.won})::int`,
    })
    .from(result)
    .innerJoin(user, eq(user.id, result.userId))
    .groupBy(result.userId, user.name)
    .orderBy(desc(sql`sum(${result.points})`))
    .limit(limit);
}

export async function statsFor(userId: string) {
  const rows = await db
    .select({
      points: sql<number>`coalesce(sum(${result.points}), 0)::int`,
      matchesWon: sql<number>`count(*) filter (where ${result.round} = 0 and ${result.won})::int`,
      matches: sql<number>`count(*) filter (where ${result.round} = 0)::int`,
      roundsWon: sql<number>`count(*) filter (where ${result.round} > 0 and ${result.won})::int`,
    })
    .from(result)
    .where(eq(result.userId, userId))
    .limit(1);
  return rows[0];
}

/** Rooms a user played in, newest first. */
export function historyFor(userId: string, limit = 30) {
  return db
    .select({ code: room.code, name: room.name, mode: room.mode, status: room.status, updatedAt: room.updatedAt })
    .from(roomMember)
    .innerJoin(room, eq(room.code, roomMember.roomCode))
    .where(eq(roomMember.userId, userId))
    .orderBy(desc(room.updatedAt))
    .limit(limit);
}

export async function isMember(code: string, userId: string) {
  const rows = await db.select({ code: roomMember.roomCode }).from(roomMember)
    .where(and(eq(roomMember.roomCode, code), eq(roomMember.userId, userId))).limit(1);
  return rows.length > 0;
}

export async function roomLog(code: string, limit = 2000) {
  const [meta] = await db.select({ name: room.name, mode: room.mode, status: room.status, createdAt: room.createdAt })
    .from(room).where(eq(room.code, code)).limit(1);
  const events = await db
    .select({ seq: gameEvent.seq, round: gameEvent.round, kind: gameEvent.kind, text: gameEvent.text, createdAt: gameEvent.createdAt })
    .from(gameEvent)
    .where(eq(gameEvent.roomCode, code))
    .orderBy(asc(gameEvent.seq))
    .limit(limit);
  return meta ? { ...meta, events } : null;
}
