import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

/**
 * Creates the `ledge_test` database if needed and applies all migrations to it.
 * Requires the dev Postgres to be running (`pnpm db:up`).
 */
export default async function setup() {
  const testUrl = process.env.TEST_DATABASE_URL;
  if (!testUrl) throw new Error("TEST_DATABASE_URL is not set");

  const target = new URL(testUrl);
  const dbName = target.pathname.replace(/^\//, "");
  if (!/^[a-z0-9_]+$/.test(dbName) || !dbName.endsWith("_test")) {
    throw new Error(`Refusing to run tests against database "${dbName}" (must end in _test)`);
  }

  const admin = new URL(testUrl);
  admin.pathname = "/postgres";
  const adminPool = new Pool({ connectionString: admin.toString() });
  try {
    const exists = await adminPool.query("select 1 from pg_database where datname = $1", [dbName]);
    if (exists.rowCount === 0) await adminPool.query(`create database "${dbName}"`);
  } catch (error) {
    throw new Error(
      `Could not reach Postgres for integration tests. Is it running? (pnpm db:up)\n${String(error)}`,
    );
  } finally {
    await adminPool.end();
  }

  const pool = new Pool({ connectionString: testUrl });
  try {
    await migrate(drizzle(pool), { migrationsFolder: "./src/server/db/migrations" });
  } finally {
    await pool.end();
  }
}
