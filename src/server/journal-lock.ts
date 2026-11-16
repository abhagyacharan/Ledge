import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/server/db/client";
import { account, userSettings, type JournalRelock } from "@/server/db/schema";
import { getEnv } from "@/server/env";
import { getSession } from "@/server/session";

/**
 * The journal lock (docs/journal-spec.md, "Journal lock"). Optional: turned on from Settings or
 * the Journal's menu. The PIN (4 or 6 digits) is stored as a scrypt hash. A correct PIN, or the
 * account password, sets a signed httpOnly cookie tied to this sign-in; without it the server
 * sends no journal content. Wrong PINs pause entry for 5, then 15, then 60 minutes.
 */

export const JOURNAL_COOKIE = "ledge_journal";
const MAX_AGE_MS = 12 * 60 * 60 * 1000;
export const MAX_PIN_TRIES = 5;
/** Pause lengths, one after another; the last repeats. */
export const PAUSE_MINUTES = [5, 15, 60] as const;

export type JournalLock =
  | { state: "off" }
  | { state: "unlocked"; pinLength: 4 | 6; relock: JournalRelock }
  | { state: "locked"; pinLength: 4 | 6; relock: JournalRelock }
  | { state: "paused"; pinLength: 4 | 6; relock: JournalRelock; until: Date };

function sign(sessionId: string, expires: number): string {
  return createHmac("sha256", getEnv().BETTER_AUTH_SECRET)
    .update(`journal:${sessionId}:${expires}`)
    .digest("base64url");
}

/** Does this cookie value unlock the journal for this sign-in, right now? Pure, for tests. */
export function cookieUnlocks(
  value: string | undefined,
  sessionId: string,
  now = Date.now(),
): boolean {
  if (!value) return false;
  const [expiresText, signature] = value.split(".");
  const expires = Number(expiresText);
  if (!signature || !Number.isFinite(expires) || expires < now || expires > now + MAX_AGE_MS) {
    return false;
  }
  const expected = Buffer.from(sign(sessionId, expires));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** How long the next pause lasts, after `lockouts` earlier ones. Pure. */
export function pauseMinutes(lockouts: number): number {
  return PAUSE_MINUTES[Math.min(lockouts, PAUSE_MINUTES.length - 1)];
}

async function currentSessionId(): Promise<string | null> {
  const session = await getSession();
  return session?.session.id ?? null;
}

async function row(userId: string) {
  const [found] = await db
    .select({
      hash: userSettings.journalPinHash,
      length: userSettings.journalPinLength,
      failures: userSettings.journalPinFailures,
      lockouts: userSettings.journalPinLockouts,
      lockedUntil: userSettings.journalPinLockedUntil,
      relock: userSettings.journalRelock,
    })
    .from(userSettings)
    .where(eq(userSettings.userId, userId));
  return found ?? null;
}

const lengthOf = (n: number | null): 4 | 6 => (n === 6 ? 6 : 4);

/** Off, unlocked, locked, or paused after too many wrong PINs. */
export async function journalLock(userId: string, now = new Date()): Promise<JournalLock> {
  const r = await row(userId);
  if (!r?.hash) return { state: "off" };
  const base = { pinLength: lengthOf(r.length), relock: r.relock };
  const sessionId = await currentSessionId();
  const value = (await cookies()).get(JOURNAL_COOKIE)?.value;
  if (sessionId && cookieUnlocks(value, sessionId, now.getTime())) {
    return { state: "unlocked", ...base };
  }
  if (r.lockedUntil && r.lockedUntil > now) {
    return { state: "paused", ...base, until: r.lockedUntil };
  }
  return { state: "locked", ...base };
}

/** True when journal content may be read or written: no lock, or unlocked. */
export async function journalOpen(userId: string): Promise<boolean> {
  const lock = await journalLock(userId);
  return lock.state === "off" || lock.state === "unlocked";
}

async function setUnlockCookie() {
  const sessionId = await currentSessionId();
  if (!sessionId) return;
  const expires = Date.now() + MAX_AGE_MS;
  (await cookies()).set(JOURNAL_COOKIE, `${expires}.${sign(sessionId, expires)}`, {
    httpOnly: true,
    sameSite: "strict",
    secure: getEnv().BETTER_AUTH_URL.startsWith("https://"),
    path: "/",
    // No maxAge: the browser drops it when it closes; the signed expiry caps it at 12 hours.
  });
}

export async function lockJournal() {
  (await cookies()).delete(JOURNAL_COOKIE);
}

const cleared = { journalPinFailures: 0, journalPinLockouts: 0, journalPinLockedUntil: null };

async function storePin(userId: string, pin: string) {
  await db
    .update(userSettings)
    .set({ journalPinHash: await hashPassword(pin), journalPinLength: pin.length, ...cleared })
    .where(eq(userSettings.userId, userId));
}

/** Turns the lock on with a first PIN, and unlocks. Refuses when a PIN already exists. */
export async function turnOnJournalLock(userId: string, pin: string): Promise<boolean> {
  const r = await row(userId);
  if (!r || r.hash) return false;
  await storePin(userId, pin);
  await setUnlockCookie();
  return true;
}

async function pinMatches(userId: string, pin: string): Promise<boolean> {
  const r = await row(userId);
  if (!r?.hash) return false;
  return verifyPassword({ hash: r.hash, password: pin });
}

/** Change the PIN: the current PIN first (Settings, screen 7f). */
export async function changeJournalPin(
  userId: string,
  currentPin: string,
  pin: string,
): Promise<boolean> {
  if (!(await pinMatches(userId, currentPin))) return false;
  await storePin(userId, pin);
  return true;
}

/** Turn the lock off: the current PIN first. */
export async function turnOffJournalLock(userId: string, currentPin: string): Promise<boolean> {
  if (!(await pinMatches(userId, currentPin))) return false;
  await db
    .update(userSettings)
    .set({ journalPinHash: null, journalPinLength: null, ...cleared })
    .where(eq(userSettings.userId, userId));
  await lockJournal();
  return true;
}

/** Forgot PIN (screen 7e): after the account password, a new PIN; unlocks. */
export async function resetJournalPin(userId: string, pin: string): Promise<void> {
  await storePin(userId, pin);
  await setUnlockCookie();
}

/** "Unlock with account password" (screen 7d): always a way in; clears the pause. */
export async function unlockWithPassword(userId: string): Promise<void> {
  await db.update(userSettings).set(cleared).where(eq(userSettings.userId, userId));
  await setUnlockCookie();
}

export async function setJournalRelock(userId: string, relock: JournalRelock) {
  await db
    .update(userSettings)
    .set({ journalRelock: relock })
    .where(eq(userSettings.userId, userId));
}

export type UnlockResult =
  | { ok: true }
  | { ok: false; reason: "wrong"; triesLeft: number }
  | { ok: false; reason: "paused"; until: Date }
  | { ok: false; reason: "no_pin" };

/** Checks the PIN. Five wrong in a row pause entry for 5, then 15, then 60 minutes. */
export async function unlockJournal(
  userId: string,
  pin: string,
  now = new Date(),
): Promise<UnlockResult> {
  const r = await row(userId);
  if (!r?.hash) return { ok: false, reason: "no_pin" };
  if (r.lockedUntil && r.lockedUntil > now) {
    return { ok: false, reason: "paused", until: r.lockedUntil };
  }
  if (await verifyPassword({ hash: r.hash, password: pin })) {
    await db.update(userSettings).set(cleared).where(eq(userSettings.userId, userId));
    await setUnlockCookie();
    return { ok: true };
  }
  // A pause that has ended starts the count of wrong tries again.
  const failures = (r.lockedUntil ? 0 : r.failures) + 1;
  if (failures >= MAX_PIN_TRIES) {
    const until = new Date(now.getTime() + pauseMinutes(r.lockouts) * 60_000);
    await db
      .update(userSettings)
      .set({
        journalPinFailures: 0,
        journalPinLockouts: r.lockouts + 1,
        journalPinLockedUntil: until,
      })
      .where(eq(userSettings.userId, userId));
    return { ok: false, reason: "paused", until };
  }
  await db
    .update(userSettings)
    .set({ journalPinFailures: failures, journalPinLockedUntil: null })
    .where(eq(userSettings.userId, userId));
  return { ok: false, reason: "wrong", triesLeft: MAX_PIN_TRIES - failures };
}

/**
 * The account password, checked against Better Auth's own stored hash (email sign-in). Guarded
 * by a small per-user limit (5 tries in 15 minutes), since it is another way to test passwords.
 */
const passwordTries = new Map<string, number[]>();

export async function passwordMatches(
  userId: string,
  password: string,
  now = Date.now(),
): Promise<"ok" | "wrong" | "limited"> {
  const recent = (passwordTries.get(userId) ?? []).filter((t) => now - t < 15 * 60_000);
  if (recent.length >= 5) return "limited";
  const [found] = await db
    .select({ hash: account.password })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, "credential")));
  const good = found?.hash ? await verifyPassword({ hash: found.hash, password }) : false;
  if (good) {
    passwordTries.delete(userId);
    return "ok";
  }
  passwordTries.set(userId, [...recent, now]);
  return "wrong";
}

/** Tests only. */
export function resetPasswordTries() {
  passwordTries.clear();
}
