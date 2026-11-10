import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

/**
 * Creates the database named in `url` if it does not exist and applies every migration to it.
 * Refuses any database whose name does not end in `suffix`, so a test run can never touch the
 * development database. Requires the dev Postgres to be running (`pnpm db:up`).
 */
export async function prepareDatabase(url: string, suffix: string) {
  const target = new URL(url);
  const dbName = target.pathname.replace(/^\//, "");
  if (!/^[a-z0-9_]+$/.test(dbName) || !dbName.endsWith(suffix)) {
    throw new Error(`Refusing to use database "${dbName}" (the name must end in ${suffix})`);
  }

  const admin = new URL(url);
  admin.pathname = "/postgres";
  const adminPool = new Pool({ connectionString: admin.toString() });
  try {
    const exists = await adminPool.query("select 1 from pg_database where datname = $1", [dbName]);
    if (exists.rowCount === 0) await adminPool.query(`create database "${dbName}"`);
  } catch (error) {
    throw new Error(`Could not reach Postgres. Is it running? (pnpm db:up)\n${String(error)}`);
  } finally {
    await adminPool.end();
  }

  const pool = new Pool({ connectionString: url });
  try {
    await migrate(drizzle(pool), { migrationsFolder: "./src/server/db/migrations" });
  } finally {
    await pool.end();
  }
}
