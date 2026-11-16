"use server";

import { revalidatePath } from "next/cache";
import { todayIn } from "@/lib/dates";
import { fail, ok } from "@/lib/result";
import { guarded } from "@/server/action-guard";
import { getJournalDates, saveJournalEntry } from "@/server/data/journal";
import { getUserSettings } from "@/server/data/settings";
import { journalOpen } from "@/server/journal-lock";
import { monthEnd, monthStart } from "./calendar";
import { journalMonthSchema, saveJournalSchema } from "./schema";

const LOCKED = "The journal is locked. Enter your PIN to keep writing.";

/**
 * Saves a journal page (autosave: called as you type and when you leave the box). Only the
 * journal page is revalidated, so typing does not re-render the rest of the app.
 */
export async function saveJournalEntryAction(input: unknown) {
  return guarded(saveJournalSchema, input, async ({ date, body, mood }, userId) => {
    if (!(await journalOpen(userId))) return fail(LOCKED);
    const { timezone } = await getUserSettings(userId);
    if (date > todayIn(timezone)) return fail("You can write about today or earlier.");
    const saved = await saveJournalEntry(userId, date, { body, mood });
    revalidatePath("/journal");
    return ok({ savedAt: (saved?.updatedAt ?? new Date()).toISOString() });
  });
}

/** The days of a month that have a page, for the dots in the day picker. */
export async function journalMonthDatesAction(input: unknown) {
  return guarded(journalMonthSchema, input, async (month, userId) => {
    if (!(await journalOpen(userId))) return fail(LOCKED);
    return ok(await getJournalDates(userId, monthStart(month), monthEnd(month)));
  });
}
