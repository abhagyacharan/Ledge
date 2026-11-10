import { sql } from "drizzle-orm";
import { auth } from "@/server/auth";
import { db } from "@/server/db/client";

export const TEST_PASSWORD = "correct-horse-battery";

/** Removes every user (sessions and accounts cascade) and rate-limit rows. */
export async function resetAuthData() {
  await db.execute(sql`truncate table "user", "rate_limit" restart identity cascade`);
}

export type TestUser = {
  id: string;
  email: string;
  /** Cookie header value that authenticates as this user. */
  cookie: string;
};

/** Creates a user through Better Auth (real hashing, real session) and returns a session cookie. */
export async function createTestUser(email: string, name = "Test User"): Promise<TestUser> {
  const result = await auth.api.signUpEmail({
    body: { email, password: TEST_PASSWORD, name },
  });
  const signIn = await auth.api.signInEmail({
    body: { email, password: TEST_PASSWORD },
    returnHeaders: true,
  });
  const setCookie = signIn.headers.getSetCookie();
  const cookie = setCookie.map((c) => c.split(";")[0]).join("; ");
  return { id: result.user.id, email, cookie };
}

/** Resolve the session for a given cookie, as a request from that user would. */
export async function sessionFor(user: TestUser) {
  return auth.api.getSession({ headers: new Headers({ cookie: user.cookie }) });
}
