import { and, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/server/db/client";
import { account, session, user, userAvatars } from "@/server/db/schema";
import { testAuth } from "../helpers/action-session";
import { createTestUser, resetAuthData, TEST_PASSWORD } from "../helpers/users";

vi.mock("@/server/session", async () => (await import("../helpers/action-session")).sessionModule);
vi.mock("next/headers", async () => (await import("../helpers/action-session")).headersModule);
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

const {
  deleteAccountAction,
  disconnectGoogleAction,
  signOutDeviceAction,
  signOutOtherDevicesAction,
  uploadAvatarAction,
} = await import("@/modules/account/actions");
const { getAvatar, markAvatarRemoved, purgeRemovedAvatar, saveAvatar } =
  await import("@/server/data/avatars");
const { listDevices } = await import("@/server/data/devices");

const sessionsOf = (userId: string) =>
  db.select({ id: session.id }).from(session).where(eq(session.userId, userId));

/** A Google account row for this user, as Better Auth would add on Connect Google. */
const addGoogle = (userId: string) =>
  db.insert(account).values({ userId, providerId: "google", accountId: `g-${userId}` });

/** Leaves the account with Google as its only way in. */
const dropPassword = (userId: string) =>
  db
    .delete(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, "credential")))
    .returning();

beforeEach(async () => {
  process.env.ALLOW_SIGNUP = "true";
  await resetAuthData();
});

describe("devices (Settings › Sign-in & security)", () => {
  it("lists this account's sessions with this device first", async () => {
    const a = await createTestUser("a@example.com");
    const [first, second] = await sessionsOf(a.id);
    const devices = await listDevices(a.id, second.id);
    expect(devices.map((d) => d.id).sort()).toEqual([first.id, second.id].sort());
    expect(devices[0]).toMatchObject({ id: second.id, current: true });
  });

  it("signs out one other device, never this one or someone else's", async () => {
    const a = await createTestUser("a@example.com");
    const b = await createTestUser("b@example.com");
    const [mine, other] = await sessionsOf(a.id);
    const [theirs] = await sessionsOf(b.id);
    testAuth.reset(a.id);
    testAuth.sessionId = mine.id;

    expect((await signOutDeviceAction({ id: theirs.id })).ok).toBe(false);
    expect((await signOutDeviceAction({ id: mine.id })).ok).toBe(false);
    expect(await sessionsOf(b.id)).toHaveLength(2);

    expect(await signOutDeviceAction({ id: other.id })).toEqual({ ok: true, data: undefined });
    expect(await sessionsOf(a.id)).toEqual([{ id: mine.id }]);
  });

  it("signs out everywhere else and keeps this device", async () => {
    const a = await createTestUser("a@example.com");
    const b = await createTestUser("b@example.com");
    const [mine] = await sessionsOf(a.id);
    testAuth.reset(a.id);
    testAuth.sessionId = mine.id;
    expect((await signOutOtherDevicesAction({})).ok).toBe(true);
    expect(await sessionsOf(a.id)).toEqual([{ id: mine.id }]);
    expect(await sessionsOf(b.id)).toHaveLength(2);
  });
});

describe("disconnect Google", () => {
  it("refuses when Google is the only way in, and works once there is a password", async () => {
    const a = await createTestUser("a@example.com");
    await addGoogle(a.id);
    testAuth.reset(a.id);
    const [credential] = await dropPassword(a.id);
    expect((await disconnectGoogleAction({})).ok).toBe(false);

    await db.insert(account).values(credential);
    expect((await disconnectGoogleAction({})).ok).toBe(true);
    const left = await db.select().from(account).where(eq(account.userId, a.id));
    expect(left.map((r) => r.providerId)).toEqual(["credential"]);
  });
});

describe("delete account", () => {
  it("needs the phrase and the right password", async () => {
    const a = await createTestUser("a@example.com");
    testAuth.reset(a.id);
    const noPhrase = await deleteAccountAction({ confirm: "delete it", password: TEST_PASSWORD });
    expect(noPhrase.ok).toBe(false);
    const wrong = await deleteAccountAction({ confirm: "delete my ledge", password: "nope nope" });
    expect(wrong).toMatchObject({
      ok: false,
      fieldErrors: { password: "That password isn't right." },
    });
    expect(await db.select().from(user).where(eq(user.id, a.id))).toHaveLength(1);

    const right = await deleteAccountAction({
      confirm: "Delete my Ledge ",
      password: TEST_PASSWORD,
    });
    expect(right.ok).toBe(true);
    expect(await db.select().from(user).where(eq(user.id, a.id))).toHaveLength(0);
  });

  it("asks an account with only Google to confirm with Google first", async () => {
    const a = await createTestUser("a@example.com");
    await addGoogle(a.id);
    await dropPassword(a.id);
    testAuth.reset(a.id);

    // An old sign-in is not enough.
    expect(await deleteAccountAction({ confirm: "delete my ledge" })).toMatchObject({
      ok: false,
      error: "Confirm with Google first.",
    });
    // A Google sign-in a moment ago is.
    testAuth.sessionCreatedAt = new Date();
    expect((await deleteAccountAction({ confirm: "delete my ledge" })).ok).toBe(true);
    expect(await db.select().from(user).where(eq(user.id, a.id))).toHaveLength(0);
  });
});

describe("profile photo", () => {
  const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]);

  it("refuses anything that isn't a JPEG, PNG or WebP, whatever it is called", async () => {
    const a = await createTestUser("a@example.com");
    testAuth.reset(a.id);
    const form = new FormData();
    form.set("photo", new Blob(["<svg onload=alert(1)>"], { type: "image/png" }), "x.png");
    expect(await uploadAvatarAction(form)).toMatchObject({ ok: false });
    expect(await getAvatar(a.id)).toBeNull();
  });

  it("keeps one photo per account, versioned, and only its owner's", async () => {
    const a = await createTestUser("a@example.com");
    const b = await createTestUser("b@example.com");
    expect(await saveAvatar(a.id, "image/png", PNG)).toBe(1);
    expect(await saveAvatar(a.id, "image/png", PNG)).toBe(2);
    expect((await getAvatar(a.id))?.version).toBe(2);
    expect(await getAvatar(b.id)).toBeNull();
  });

  it("erases a removed photo only once it is no longer shown and Undo is long past", async () => {
    const a = await createTestUser("a@example.com");
    await saveAvatar(a.id, "image/png", PNG);
    await db.update(user).set({ image: null }).where(eq(user.id, a.id));
    await markAvatarRemoved(a.id);
    await purgeRemovedAvatar(a.id);
    // Just removed: kept for Undo.
    expect(await getAvatar(a.id)).not.toBeNull();

    await db
      .update(userAvatars)
      .set({ updatedAt: new Date(Date.now() - 60 * 60_000) })
      .where(eq(userAvatars.userId, a.id));
    await purgeRemovedAvatar(a.id);
    expect(await getAvatar(a.id)).toBeNull();
  });

  it("keeps a photo that is still shown", async () => {
    const a = await createTestUser("a@example.com");
    await saveAvatar(a.id, "image/png", PNG);
    await db.update(user).set({ image: "/api/avatar?v=1" }).where(eq(user.id, a.id));
    await db
      .update(userAvatars)
      .set({ updatedAt: new Date(Date.now() - 60 * 60_000) })
      .where(eq(userAvatars.userId, a.id));
    await purgeRemovedAvatar(a.id);
    expect(await getAvatar(a.id)).not.toBeNull();
  });
});
