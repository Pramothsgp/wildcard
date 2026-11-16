// Applies pending migrations. Runs before every service starts (see Dockerfile), so it
// takes a Postgres advisory lock: services starting at the same time apply them once.
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

const LOCK_ID = 727_274_001;
const migrationsFolder =
  process.env.MIGRATIONS_DIR ?? fileURLToPath(new URL("./drizzle", import.meta.url));

if (!process.env.DATABASE_URL) {
  console.error("migrate: DATABASE_URL is not set");
  process.exit(1);
}

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query("select pg_advisory_lock($1)", [LOCK_ID]);
  await migrate(drizzle(client), { migrationsFolder });
  console.log("migrate: up to date");
} finally {
  await client.query("select pg_advisory_unlock($1)", [LOCK_ID]).catch(() => {});
  await client.end();
}
