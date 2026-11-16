// Wildcard game tables. Live rooms are held in memory by the game server and written
// here after every action, so a restart or crash resumes every game where it was.
import { bigserial, boolean, index, integer, jsonb, pgTable, primaryKey, serial, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth.ts";

export const room = pgTable(
  "room",
  {
    code: text("code").primaryKey(),
    name: text("name").notNull(),
    hostId: text("host_id").notNull(),
    mode: text("mode").notNull(),
    isPublic: boolean("is_public").notNull().default(true),
    /** lobby | playing | finished | abandoned */
    status: text("status").notNull(),
    /** Full room snapshot: members, rules, game state (incl. hidden hands and deck), recent chat. */
    state: jsonb("state").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    finishedAt: timestamp("finished_at"),
  },
  (t) => [index("room_status_idx").on(t.status)],
);

export const roomMember = pgTable(
  "room_member",
  {
    roomCode: text("room_code").notNull().references(() => room.code, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
    leftAt: timestamp("left_at"),
  },
  (t) => [primaryKey({ columns: [t.roomCode, t.userId] }), index("room_member_user_idx").on(t.userId)],
);

/** Append-only log of everything that happened in a room. */
export const gameEvent = pgTable(
  "game_event",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    roomCode: text("room_code").notNull().references(() => room.code, { onDelete: "cascade" }),
    seq: integer("seq").notNull(),
    round: integer("round").notNull().default(0),
    /** Player who caused it. Bots have ids that aren't users, so no foreign key. */
    actorId: text("actor_id"),
    kind: text("kind").notNull(),
    text: text("text").notNull(),
    data: jsonb("data"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("game_event_room_seq_idx").on(t.roomCode, t.seq)],
);

/** Points per round won (round > 0) and one row per player per finished match (round = 0). */
export const result = pgTable(
  "result",
  {
    id: serial("id").primaryKey(),
    roomCode: text("room_code").notNull().references(() => room.code, { onDelete: "cascade" }),
    round: integer("round").notNull(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    points: integer("points").notNull(),
    won: boolean("won").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("result_user_idx").on(t.userId)],
);
