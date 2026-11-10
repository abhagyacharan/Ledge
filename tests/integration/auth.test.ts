import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { auth } from "@/server/auth";
import { createTestUser, resetAuthData, sessionFor, TEST_PASSWORD } from "../helpers/users";

beforeEach(async () => {
  process.env.ALLOW_SIGNUP = "true";
  await resetAuthData();
});

afterEach(() => {
  process.env.ALLOW_SIGNUP = "true";
});

describe("sign-up", () => {
  it("creates a user and a session", async () => {
    const user = await createTestUser("a@example.com");
    const session = await sessionFor(user);
    expect(session?.user.email).toBe("a@example.com");
  });

  it("rejects passwords shorter than 10 characters", async () => {
    await expect(
      auth.api.signUpEmail({ body: { email: "a@example.com", password: "short", name: "A" } }),
    ).rejects.toThrow();
  });

  it("is refused on the server when ALLOW_SIGNUP=false", async () => {
    process.env.ALLOW_SIGNUP = "false";
    await expect(
      auth.api.signUpEmail({
        body: { email: "a@example.com", password: TEST_PASSWORD, name: "A" },
      }),
    ).rejects.toMatchObject({ status: "FORBIDDEN" });
  });
});

describe("sign-in", () => {
  it("gives the same error for an unknown email and a wrong password", async () => {
    await createTestUser("a@example.com");
    const wrongPassword = await auth.api
      .signInEmail({ body: { email: "a@example.com", password: "not-the-password" } })
      .catch((e: unknown) => e);
    const unknownEmail = await auth.api
      .signInEmail({ body: { email: "nobody@example.com", password: "not-the-password" } })
      .catch((e: unknown) => e);
    expect(wrongPassword).toMatchObject({ status: "UNAUTHORIZED" });
    expect(unknownEmail).toMatchObject({
      status: "UNAUTHORIZED",
      body: (wrongPassword as { body: unknown }).body,
    });
  });

  it("sets an httpOnly, sameSite=lax session cookie", async () => {
    await createTestUser("a@example.com");
    const response = await auth.handler(
      new Request("http://localhost:3000/api/auth/sign-in/email", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "http://localhost:3000" },
        body: JSON.stringify({ email: "a@example.com", password: TEST_PASSWORD }),
      }),
    );
    expect(response.status).toBe(200);
    const cookie = response.headers.getSetCookie().find((c) => c.includes("session_token"));
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
  });
});

describe("two-user fixture (ownership scaffold)", () => {
  // Phases 2 and 3 add: user B cannot read, update or delete user A's lists and tasks.
  it("resolves each cookie to its own user and never the other", async () => {
    const a = await createTestUser("a@example.com", "A");
    const b = await createTestUser("b@example.com", "B");
    expect(a.id).not.toBe(b.id);
    expect((await sessionFor(a))?.user.id).toBe(a.id);
    expect((await sessionFor(b))?.user.id).toBe(b.id);
  });

  it("returns no session without a valid cookie", async () => {
    await createTestUser("a@example.com");
    expect(await auth.api.getSession({ headers: new Headers() })).toBeNull();
    expect(
      await auth.api.getSession({
        headers: new Headers({ cookie: "better-auth.session_token=forged.value" }),
      }),
    ).toBeNull();
  });
});
