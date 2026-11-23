"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, ok } from "@/lib/result";
import { guarded } from "@/server/action-guard";
import { getSignInMethods } from "@/server/data/sign-in-methods";
import {
  changeJournalPin,
  lockJournal,
  passwordMatches,
  resetJournalPin,
  setJournalRelock,
  turnOffJournalLock,
  turnOnJournalLock,
  unlockJournal,
  unlockWithPassword,
} from "@/server/journal-lock";
import {
  changePinSchema,
  passwordSchema,
  relockSchema,
  resetPinSchema,
  turnOffSchema,
  turnOnSchema,
  unlockSchema,
} from "./schema";

/**
 * The journal lock (docs/journal-spec.md, "Journal lock", screens 7a to 7f): turn it on with a
 * PIN, unlock with the PIN or the account password, reset a forgotten PIN with the password, and
 * change the PIN or turn the lock off with the current PIN.
 */

/** The same neutral words as a failed sign-in, so it gives nothing away. */
const WRONG_PASSWORD = "That password didn't work. Check it and try again.";
const TOO_MANY_PASSWORDS = "Too many tries. Wait a few minutes, then try again.";

function refresh() {
  revalidatePath("/", "layout");
}

function pausedFor(until: Date) {
  return { paused: until.toISOString() };
}

/** Shown to an account made with Google that has no password yet (O, 2026-11-23). */
const NEEDS_PASSWORD =
  "Set a password in Settings › Security first. The lock needs it in case you forget the PIN.";

export async function turnOnJournalLockAction(input: unknown) {
  return guarded(turnOnSchema, input, async ({ pin }, userId) => {
    if (!(await getSignInMethods(userId)).password) return fail(NEEDS_PASSWORD);
    if (!(await turnOnJournalLock(userId, pin))) {
      return fail("The lock is already on. Change the PIN in Settings.");
    }
    refresh();
    return ok();
  });
}

/** `data.paused` (an ISO time) means entry is paused; the screen switches to the countdown. */
export async function unlockJournalAction(input: unknown) {
  return guarded(unlockSchema, input, async ({ pin }, userId) => {
    const result = await unlockJournal(userId, pin);
    if (result.ok) {
      refresh();
      return ok({ paused: null as string | null });
    }
    if (result.reason === "no_pin") return fail("The lock is off.");
    if (result.reason === "paused") return ok(pausedFor(result.until));
    return fail(
      `That PIN isn't right. ${result.triesLeft} ${result.triesLeft === 1 ? "try" : "tries"} left.`,
    );
  });
}

export async function unlockWithPasswordAction(input: unknown) {
  return guarded(passwordSchema, input, async ({ password }, userId) => {
    const check = await passwordMatches(userId, password);
    if (check === "limited") return fail(TOO_MANY_PASSWORDS);
    if (check === "wrong") return fail(WRONG_PASSWORD, { password: WRONG_PASSWORD });
    await unlockWithPassword(userId);
    refresh();
    return ok();
  });
}

/** Forgot PIN, step one: is this the account password? (The new PIN is checked again with it.) */
export async function checkPasswordAction(input: unknown) {
  return guarded(passwordSchema, input, async ({ password }, userId) => {
    const check = await passwordMatches(userId, password);
    if (check === "limited") return fail(TOO_MANY_PASSWORDS);
    if (check === "wrong") return fail(WRONG_PASSWORD, { password: WRONG_PASSWORD });
    return ok();
  });
}

export async function resetJournalPinAction(input: unknown) {
  return guarded(resetPinSchema, input, async ({ password, pin }, userId) => {
    const check = await passwordMatches(userId, password);
    if (check !== "ok") return fail(check === "limited" ? TOO_MANY_PASSWORDS : WRONG_PASSWORD);
    await resetJournalPin(userId, pin);
    refresh();
    return ok();
  });
}

export async function changeJournalPinAction(input: unknown) {
  return guarded(changePinSchema, input, async ({ currentPin, pin }, userId) => {
    if (!(await changeJournalPin(userId, currentPin, pin))) {
      return fail("That's not your current PIN.", { currentPin: "That's not your current PIN." });
    }
    refresh();
    return ok();
  });
}

export async function turnOffJournalLockAction(input: unknown) {
  return guarded(turnOffSchema, input, async ({ currentPin }, userId) => {
    if (!(await turnOffJournalLock(userId, currentPin))) {
      return fail("That's not your current PIN.", { currentPin: "That's not your current PIN." });
    }
    refresh();
    return ok();
  });
}

export async function setJournalRelockAction(input: unknown) {
  return guarded(relockSchema, input, async ({ relock }, userId) => {
    await setJournalRelock(userId, relock);
    refresh();
    return ok();
  });
}

export async function lockJournalAction(input: unknown = {}) {
  return guarded(z.object({}), input, async () => {
    await lockJournal();
    refresh();
    return ok();
  });
}
