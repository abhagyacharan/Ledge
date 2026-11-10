import { sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { user } from "@/server/db/schema";
import { ensureUserDefaults } from "@/server/user-defaults";

/**
 * Fast test fixtures. This file must not import `@/server/auth`: loading Better Auth is the
 * slowest part of starting a test file, and most tests do not need it.
 */

export type TestUser = {
  id: string;
  email: string;
  /** Cookie header value that authenticates as this user (empty for fast users). */
  cookie: string;
};

/** Removes every user (sessions, accounts and all their data cascade) and rate-limit rows. */
export async function resetAuthData() {
  await db.execute(sql`truncate table "user", "rate_limit" restart identity cascade`);
}

/**
 * Inserts the user row directly (no password, no session) and runs the same defaults as sign-up
 * (settings and Inbox). Password hashing is deliberately slow, so use this whenever a test only
 * needs a user id. Only the sign-in and session tests use `createTestUser` from `users.ts`.
 */
export async function createUser(email: string, name = "Test User"): Promise<TestUser> {
  const [row] = await db.insert(user).values({ email, name }).returning({ id: user.id });
  await ensureUserDefaults(row.id);
  return { id: row.id, email, cookie: "" };
}
