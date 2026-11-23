import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getJournalEntry, saveJournalEntry } from "@/server/data/journal";
import { db } from "@/server/db/client";
import { account, userSettings } from "@/server/db/schema";
import { testAuth } from "../helpers/action-session";
import { createUser, resetAuthData, type TestUser } from "../helpers/fast-users";

// The signed-in user, session and cookie jar, shared with other action tests (see the helper).
vi.mock("@/server/session", async () => (await import("../helpers/action-session")).sessionModule);
vi.mock("next/headers", async () => (await import("../helpers/action-session")).headersModule);
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

const lock = await import("@/server/journal-lock");
const actions = await import("@/modules/journal/lock-actions");
const { saveJournalEntryAction } = await import("@/modules/journal/actions");
const { exportEverything } = await import("@/server/data/export");

let a: TestUser;

beforeEach(async () => {
  process.env.ALLOW_SIGNUP = "true";
  await resetAuthData();
  a = await createUser("a@example.com", "A");
  testAuth.reset(a.id);
  lock.resetPasswordTries();
  // The lock needs an account password (the way back in after a forgotten PIN).
  await givePassword();
});

const state = async () => (await lock.journalLock(a.id)).state;

async function givePassword(password = "correct horse battery") {
  await db.insert(account).values({
    accountId: a.id,
    providerId: "credential",
    userId: a.id,
    password: await hashPassword(password),
    updatedAt: new Date(),
  });
}

describe("an account made with Google", () => {
  it("cannot turn the lock on until it has a password", async () => {
    await db.delete(account).where(eq(account.userId, a.id));
    await db.insert(account).values({
      accountId: "google-123",
      providerId: "google",
      userId: a.id,
      updatedAt: new Date(),
    });
    expect(await actions.turnOnJournalLockAction({ pin: "1234", confirm: "1234" })).toMatchObject({
      ok: false,
      error: expect.stringMatching(/Set a password/),
    });
    expect(await state()).toBe("off");
  });
});

describe("turning the lock on and unlocking", () => {
  it("is off until turned on; then unlocks for this sign-in only, and locks again", async () => {
    expect(await state()).toBe("off");
    expect(await actions.turnOnJournalLockAction({ pin: "1234", confirm: "1234" })).toEqual({
      ok: true,
      data: undefined,
    });
    expect(await state()).toBe("unlocked");
    // Turning it on twice is refused: the PIN is changed in Settings.
    expect(await actions.turnOnJournalLockAction({ pin: "9999", confirm: "9999" })).toMatchObject({
      ok: false,
    });

    await actions.lockJournalAction({});
    expect(await state()).toBe("locked");
    expect(await actions.unlockJournalAction({ pin: "1234" })).toEqual({
      ok: true,
      data: { paused: null },
    });
    testAuth.sessionId = "session-2";
    expect(await state()).toBe("locked");
  });

  it("takes a 6-digit PIN, refuses mismatches and letters, and stores only a hash", async () => {
    expect(await actions.turnOnJournalLockAction({ pin: "1234", confirm: "4321" })).toMatchObject({
      ok: false,
      fieldErrors: { confirm: "Those didn't match. Try again." },
    });
    expect(await actions.turnOnJournalLockAction({ pin: "12a4", confirm: "12a4" })).toMatchObject({
      ok: false,
    });
    expect(await actions.turnOnJournalLockAction({ pin: "12345", confirm: "12345" })).toMatchObject(
      {
        ok: false,
      },
    );
    await actions.turnOnJournalLockAction({ pin: "246810", confirm: "246810" });
    expect(await lock.journalLock(a.id)).toMatchObject({
      state: "unlocked",
      pinLength: 6,
      relock: "leave",
    });
    const [row] = await db.select().from(userSettings).where(eq(userSettings.userId, a.id));
    expect(row.journalPinHash).toBeTruthy();
    expect(row.journalPinHash).not.toContain("246810");
  });
});

describe("wrong PINs", () => {
  it("pauses for 5, then 15, then 60 minutes; the right PIN resets it", async () => {
    await lock.turnOnJournalLock(a.id, "1234");
    let now = new Date("2026-11-16T10:00:00Z");
    const fiveWrong = async () => {
      for (let i = 0; i < 4; i++) await lock.unlockJournal(a.id, "0000", now);
      return lock.unlockJournal(a.id, "0000", now);
    };
    const pauseLength = (result: Awaited<ReturnType<typeof fiveWrong>>) =>
      !result.ok && result.reason === "paused" ? result.until.getTime() - now.getTime() : null;

    expect(await lock.unlockJournal(a.id, "0000", now)).toEqual({
      ok: false,
      reason: "wrong",
      triesLeft: 4,
    });
    for (let i = 0; i < 3; i++) await lock.unlockJournal(a.id, "0000", now);
    expect(pauseLength(await lock.unlockJournal(a.id, "0000", now))).toBe(5 * 60_000);
    // Even the right PIN waits the pause out.
    expect(await lock.unlockJournal(a.id, "1234", new Date("2026-11-16T10:04:00Z"))).toMatchObject({
      reason: "paused",
    });

    now = new Date("2026-11-16T10:06:00Z");
    expect(pauseLength(await fiveWrong())).toBe(15 * 60_000);
    now = new Date("2026-11-16T10:30:00Z");
    expect(pauseLength(await fiveWrong())).toBe(60 * 60_000);
    expect(lock.pauseMinutes(7)).toBe(60);

    // The paused state is what the page sees.
    expect(await lock.journalLock(a.id, new Date("2026-11-16T10:31:00Z"))).toMatchObject({
      state: "paused",
    });
    // After it, the right PIN opens and clears the count: the next pause is 5 minutes again.
    expect(await lock.unlockJournal(a.id, "1234", new Date("2026-11-16T11:31:00Z"))).toEqual({
      ok: true,
    });
    now = new Date("2026-11-16T12:00:00Z");
    expect(pauseLength(await fiveWrong())).toBe(5 * 60_000);
  });

  it("the account password always gets in, and clears the pause", async () => {
    await lock.turnOnJournalLock(a.id, "1234");
    await actions.lockJournalAction({});
    for (let i = 0; i < 5; i++) await lock.unlockJournal(a.id, "0000");
    expect(await state()).toBe("paused");

    expect(await actions.unlockWithPasswordAction({ password: "nope" })).toMatchObject({
      ok: false,
      fieldErrors: { password: expect.any(String) },
    });
    expect(await actions.unlockWithPasswordAction({ password: "correct horse battery" })).toEqual({
      ok: true,
      data: undefined,
    });
    expect(await state()).toBe("unlocked");
  });

  it("limits password tries to 5 in 15 minutes", async () => {
    for (let i = 0; i < 5; i++) expect(await lock.passwordMatches(a.id, "wrong")).toBe("wrong");
    expect(await lock.passwordMatches(a.id, "correct horse battery")).toBe("limited");
  });

  it("rejects forged, expired and too-long-lived cookies", () => {
    const now = Date.now();
    expect(lock.cookieUnlocks(undefined, "s", now)).toBe(false);
    expect(lock.cookieUnlocks(`${now + 1000}.forged`, "s", now)).toBe(false);
    expect(lock.cookieUnlocks(`${now - 1}.x`, "s", now)).toBe(false);
    expect(lock.cookieUnlocks(`${now + 13 * 3600_000}.x`, "s", now)).toBe(false);
  });
});

describe("Settings: change, forgot, turn off, lock again", () => {
  it("changes the PIN with the current one; a wrong current PIN is refused", async () => {
    await lock.turnOnJournalLock(a.id, "1234");
    expect(
      await actions.changeJournalPinAction({ currentPin: "0000", pin: "5678", confirm: "5678" }),
    ).toMatchObject({ ok: false, fieldErrors: { currentPin: "That's not your current PIN." } });
    expect(
      await actions.changeJournalPinAction({
        currentPin: "1234",
        pin: "567890",
        confirm: "567890",
      }),
    ).toMatchObject({ ok: true });
    expect(await lock.unlockJournal(a.id, "1234")).toMatchObject({ reason: "wrong" });
    expect(await lock.unlockJournal(a.id, "567890")).toEqual({ ok: true });
    expect(await lock.journalLock(a.id)).toMatchObject({ pinLength: 6 });
  });

  it("resets a forgotten PIN with the account password, and unlocks", async () => {
    await lock.turnOnJournalLock(a.id, "1234");
    await actions.lockJournalAction({});
    expect(await actions.checkPasswordAction({ password: "wrong" })).toMatchObject({ ok: false });
    expect(
      await actions.resetJournalPinAction({ password: "wrong", pin: "1111", confirm: "1111" }),
    ).toMatchObject({ ok: false });
    expect(await actions.checkPasswordAction({ password: "correct horse battery" })).toMatchObject({
      ok: true,
    });
    expect(
      await actions.resetJournalPinAction({
        password: "correct horse battery",
        pin: "1111",
        confirm: "1111",
      }),
    ).toMatchObject({ ok: true });
    expect(await state()).toBe("unlocked");
    expect(await lock.unlockJournal(a.id, "1111")).toEqual({ ok: true });
  });

  it("turns the lock off only with the current PIN", async () => {
    await lock.turnOnJournalLock(a.id, "1234");
    expect(await actions.turnOffJournalLockAction({ currentPin: "0000" })).toMatchObject({
      ok: false,
    });
    expect(await actions.turnOffJournalLockAction({ currentPin: "1234" })).toMatchObject({
      ok: true,
    });
    expect(await state()).toBe("off");
  });

  it("saves the Lock again choice", async () => {
    await lock.turnOnJournalLock(a.id, "1234");
    expect(await actions.setJournalRelockAction({ relock: "5m" })).toMatchObject({ ok: true });
    expect(await lock.journalLock(a.id)).toMatchObject({ relock: "5m" });
    expect(await actions.setJournalRelockAction({ relock: "never" })).toMatchObject({ ok: false });
  });
});

describe("what a locked journal blocks", () => {
  it("refuses saves while locked; open without a lock or once unlocked", async () => {
    const page = { date: "2026-11-01", body: "secret", mood: null };
    expect(await saveJournalEntryAction(page)).toMatchObject({ ok: true });

    await lock.turnOnJournalLock(a.id, "1234");
    await actions.lockJournalAction({});
    expect(await saveJournalEntryAction({ ...page, body: "changed" })).toMatchObject({ ok: false });
    expect((await getJournalEntry(a.id, "2026-11-01"))?.body).toBe("secret");

    await actions.unlockJournalAction({ pin: "1234" });
    expect(await saveJournalEntryAction({ ...page, body: "changed" })).toMatchObject({ ok: true });
  });

  it("exports journal pages but never the PIN hash or lock counters", async () => {
    await lock.turnOnJournalLock(a.id, "1234");
    await saveJournalEntry(a.id, "2026-11-01", { body: "secret", mood: null });
    const data = await exportEverything(a.id);
    expect(JSON.stringify(data.journal)).toContain("secret");
    expect(data.settings).not.toHaveProperty("journalPinHash");
    expect(data.settings).not.toHaveProperty("journalPinLockouts");
  });
});
