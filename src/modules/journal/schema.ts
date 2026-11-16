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

/** The journal PIN: 4 or 6 digits (docs/journal-spec.md, "Journal lock"). */
export const journalPin = z.string().regex(/^(\d{4}|\d{6})$/, "Use 4 or 6 digits");

const matching = <T extends { pin: string; confirm: string }>(v: T) => v.pin === v.confirm;
const mismatch = { path: ["confirm"], message: "Those didn't match. Try again." };

export const turnOnSchema = z
  .object({ pin: journalPin, confirm: z.string() })
  .refine(matching, mismatch);

export const unlockSchema = z.object({ pin: journalPin });

export const passwordSchema = z.object({
  password: z.string().min(1, "Enter your password").max(200),
});

export const resetPinSchema = z
  .object({ password: z.string().min(1).max(200), pin: journalPin, confirm: z.string() })
  .refine(matching, mismatch);

export const changePinSchema = z
  .object({ currentPin: journalPin, pin: journalPin, confirm: z.string() })
  .refine(matching, mismatch);

export const turnOffSchema = z.object({ currentPin: journalPin });

export const relockSchema = z.object({ relock: z.enum(["leave", "1m", "5m", "close"]) });
