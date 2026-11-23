import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/server/db/client";
import { account, session, user } from "@/server/db/schema";
import { testAuth } from "../helpers/action-session";
import { createTestUser, resetAuthData, TEST_PASSWORD } from "../helpers/users";
import { createUser } from "../helpers/fast-users";

vi.mock("@/server/session", async () => (await import("../helpers/action-session")).sessionModule);
vi.mock("next/headers", async () => (await import("../helpers/action-session")).headersModule);
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

const { auth } = await import("@/server/auth");
const { outbox } = await import("@/server/email");
const { setPasswordAction } = await import("@/modules/account/actions");
const { getSignInMethods } = await import("@/server/data/sign-in-methods");

const NEW_PASSWORD = "a brand new password";

beforeEach(async () => {
  process.env.ALLOW_SIGNUP = "true";
  await resetAuthData();
  outbox.length = 0;
});

afterEach(() => {
  process.env.ALLOW_SIGNUP = "true";
});

/** Asks for a link and returns the token from the emailed URL (/reset-password/<token>?...). */
async function requestToken(email: string) {
  await auth.api.requestPasswordReset({ body: { email, redirectTo: "/reset-password" } });
  const sent = outbox.at(-1);
  if (!sent) return null;
  const match = /\/reset-password\/([^?\s]+)/.exec(sent.text);
  return match?.[1] ?? null;
}

const signIn = (email: string, password: string) =>
  auth.api.signInEmail({ body: { email, password } }).then(
    () => "ok",
    (e: unknown) => (e as { status?: string }).status,
  );

describe("forgot password", () => {
  it("emails a link to a known address and answers the same for an unknown one", async () => {
    await createTestUser("a@example.com", "Asha Rao");
    const known = await auth.api.requestPasswordReset({ body: { email: "a@example.com" } });
    const unknown = await auth.api.requestPasswordReset({ body: { email: "nobody@example.com" } });
    expect(unknown).toEqual(known);
    expect(outbox).toHaveLength(1);
    expect(outbox[0]).toMatchObject({ to: "a@example.com", subject: "Reset your Ledge password" });
    expect(outbox[0].text).toContain("Hi Asha,");
  });

  it("sets the new password once, ends every session and verifies the email", async () => {
    const a = await createTestUser("a@example.com");
    expect(await db.select().from(session).where(eq(session.userId, a.id))).not.toHaveLength(0);
    const token = await requestToken("a@example.com");
    expect(token).toBeTruthy();

    await auth.api.resetPassword({ body: { token: token ?? "", newPassword: NEW_PASSWORD } });

    expect(await signIn("a@example.com", TEST_PASSWORD)).toBe("UNAUTHORIZED");
    expect(await db.select().from(session).where(eq(session.userId, a.id))).toHaveLength(0);
    const [row] = await db.select({ v: user.emailVerified }).from(user).where(eq(user.id, a.id));
    expect(row.v).toBe(true);
    expect(await signIn("a@example.com", NEW_PASSWORD)).toBe("ok");
    // The link works once.
    await expect(
      auth.api.resetPassword({ body: { token: token ?? "", newPassword: "yet another one!" } }),
    ).rejects.toMatchObject({ status: "BAD_REQUEST" });
  });

  it("refuses a short password and a made-up token", async () => {
    await createTestUser("a@example.com");
    const token = await requestToken("a@example.com");
    await expect(
      auth.api.resetPassword({ body: { token: token ?? "", newPassword: "short" } }),
    ).rejects.toMatchObject({ status: "BAD_REQUEST" });
    await expect(
      auth.api.resetPassword({ body: { token: "not-a-real-token", newPassword: NEW_PASSWORD } }),
    ).rejects.toMatchObject({ status: "BAD_REQUEST" });
  });

  it("gives an account made with Google its first password", async () => {
    const g = await createUser("g@example.com", "G");
    await db
      .insert(account)
      .values({ accountId: "google-1", providerId: "google", userId: g.id, updatedAt: new Date() });
    const token = await requestToken("g@example.com");
    await auth.api.resetPassword({ body: { token: token ?? "", newPassword: NEW_PASSWORD } });
    expect(await getSignInMethods(g.id)).toMatchObject({ password: true, google: true });
    expect(await signIn("g@example.com", NEW_PASSWORD)).toBe("ok");
  });
});

describe("closed sign-ups", () => {
  it("stop any new user, Google's included, with a code the sign-in page explains", async () => {
    process.env.ALLOW_SIGNUP = "false";
    const ctx = await auth.$context;
    await expect(
      ctx.internalAdapter.createUser(
        { email: "new@example.com", name: "New", emailVerified: true },
        { method: "oauth", oauth: { providerId: "google" } },
      ),
    ).rejects.toMatchObject({ status: "FORBIDDEN", body: { code: "signup_disabled" } });
    expect(await db.select().from(user)).toHaveLength(0);
  });
});

describe("Settings › Set a password", () => {
  it("lets an account made with Google set one, then refuses a second", async () => {
    const g = await createUser("g@example.com", "G");
    await db
      .insert(account)
      .values({ accountId: "google-1", providerId: "google", userId: g.id, updatedAt: new Date() });
    testAuth.reset(g.id);

    expect(
      await setPasswordAction({ password: NEW_PASSWORD, confirm: "different!!!" }),
    ).toMatchObject({ ok: false, fieldErrors: { confirm: "The two passwords don't match" } });
    expect(await setPasswordAction({ password: NEW_PASSWORD, confirm: NEW_PASSWORD })).toEqual({
      ok: true,
      data: undefined,
    });
    expect(await signIn("g@example.com", NEW_PASSWORD)).toBe("ok");
    expect(
      await setPasswordAction({ password: NEW_PASSWORD, confirm: NEW_PASSWORD }),
    ).toMatchObject({ ok: false, error: "This account already has a password." });
  });
});
