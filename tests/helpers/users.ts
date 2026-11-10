import { auth } from "@/server/auth";
import { type TestUser } from "./fast-users";

export { resetAuthData, type TestUser } from "./fast-users";

export const TEST_PASSWORD = "correct-horse-battery";

/**
 * Creates a user through Better Auth (real password hashing, real session) and returns a session
 * cookie. Slow on purpose: only the sign-in and session tests use it. Everything else should use
 * `createUser` from `fast-users.ts`.
 */
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
