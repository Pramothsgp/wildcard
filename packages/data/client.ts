import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema/index.ts";

// One pool per process, reused across Next.js dev reloads.
const globalForDb = globalThis as unknown as { pool?: Pool };

export const pool = (globalForDb.pool ??= new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.DATABASE_POOL_MAX ?? 5),
}));

export const db = drizzle(pool, { schema });
export type Db = typeof db;
