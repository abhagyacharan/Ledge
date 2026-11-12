import { z } from "zod";
import { isIsoDate } from "@/lib/dates";
import { MAX_JOURNAL_CHARS, MOOD_MAX, MOOD_MIN } from "./limits";

/** Zod schemas for the journal, shared by the server actions and the page. */

const date = z.string().refine(isIsoDate, "Enter a valid date");

export const saveJournalSchema = z.object({
  date,
  body: z.string().max(MAX_JOURNAL_CHARS, `Use at most ${MAX_JOURNAL_CHARS} characters`),
  mood: z.number().int().min(MOOD_MIN).max(MOOD_MAX).nullable(),
});

export const journalMonthSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
});

export type SaveJournalInput = z.infer<typeof saveJournalSchema>;
