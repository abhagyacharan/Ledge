import { execSync } from "node:child_process";
import { Pool } from "pg";
import { prepareDatabase } from "../setup/database";

/**
 * Creates and migrates the e2e database, clears the sign-in rate limit counters left by earlier
 * runs, then re-seeds the demo account and its sample tasks.
 */
export default async function globalSetup() {
  const url = process.env.E2E_DATABASE_URL;
  if (!url) throw new Error("E2E_DATABASE_URL is not set (see playwright.config.ts)");
  await prepareDatabase(url, "_e2e");

  const pool = new Pool({ connectionString: url });
  try {
    await pool.query("delete from rate_limit");
  } finally {
    await pool.end();
  }

  execSync("pnpm db:seed", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url, ALLOW_SIGNUP: "true" },
  });
}
