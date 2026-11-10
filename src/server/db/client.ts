import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// Reuse the pool across hot reloads in development so connections do not pile up.
const globalForDb = globalThis as unknown as { __ledgePool?: Pool };

function createPool(): Pool {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return new Pool({ connectionString: url, max: 10 });
}

const pool = globalForDb.__ledgePool ?? createPool();
if (process.env.NODE_ENV !== "production") globalForDb.__ledgePool = pool;

export const db = drizzle(pool, { schema });
export type Database = typeof db;

/** Used by the health check and tests. */
export async function pingDb(): Promise<void> {
  await pool.query("select 1");
}
