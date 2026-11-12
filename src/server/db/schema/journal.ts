import { sql } from "drizzle-orm";
import { check, date, pgTable, smallint, text, unique, uuid } from "drizzle-orm/pg-core";
// Relative, not "@/": drizzle-kit reads this file without the app's path aliases.
import { MAX_JOURNAL_CHARS, MOOD_MAX, MOOD_MIN } from "../../../modules/journal/limits";
import { createdAt, id, updatedAt } from "./_columns";
import { user } from "./auth";

export { MAX_JOURNAL_CHARS, MOOD_MAX, MOOD_MIN };

/**
 * One journal page per day (docs/journal-spec.md). The date is floating, like task due dates:
 * it is the day in the user's own timezone. Writing in the morning and again in the evening edits
 * the same row. A page with no words and no mood is removed rather than kept empty.
 */
export const journalEntries = pgTable(
  "journal_entries",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    entryDate: date("entry_date", { mode: "string" }).notNull(),
    body: text("body").notNull().default(""),
    mood: smallint("mood"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    // One page per day; also the index every journal query uses.
    unique("journal_entries_user_date_unique").on(t.userId, t.entryDate),
    check(
      "journal_entries_body_check",
      sql`char_length(${t.body}) <= ${sql.raw(String(MAX_JOURNAL_CHARS))}`,
    ),
    check(
      "journal_entries_mood_check",
      sql`${t.mood} is null or ${t.mood} between ${sql.raw(String(MOOD_MIN))} and ${sql.raw(String(MOOD_MAX))}`,
    ),
  ],
);

export type JournalEntry = typeof journalEntries.$inferSelect;
