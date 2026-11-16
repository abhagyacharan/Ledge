import { sql } from "drizzle-orm";
import { boolean, check, pgTable, smallint, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createdAt, updatedAt } from "./_columns";
import { user } from "./auth";

export const THEMES = ["system", "light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

export const JOURNAL_RELOCK = ["leave", "1m", "5m", "close"] as const;
export type JournalRelock = (typeof JOURNAL_RELOCK)[number];

export const userSettings = pgTable(
  "user_settings",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    timezone: text("timezone").notNull().default("Asia/Kolkata"),
    /** ISO weekday the week starts on: 1 = Monday ... 7 = Sunday. */
    weekStartsOn: smallint("week_starts_on").notNull().default(1),
    theme: text("theme", { enum: THEMES }).notNull().default("system"),
    /** ISO 4217 currency code. */
    currency: text("currency").notNull().default("INR"),
    locale: text("locale").notNull().default("en-IN"),
    /** Voice capture on or off (docs/voice-spec.md §9); it also needs GROQ_API_KEY on the server. */
    voiceEnabled: boolean("voice_enabled").notNull().default(true),
    /** The journal lock (docs/journal-spec.md, "PIN lock"): a scrypt hash of the 4-digit PIN, or null. */
    journalPinHash: text("journal_pin_hash"),
    /** Wrong PINs in a row; five lock the PIN for a while. */
    journalPinFailures: smallint("journal_pin_failures").notNull().default(0),
    journalPinLockedUntil: timestamp("journal_pin_locked_until", { withTimezone: true }),
    /** 4 or 6: how many digits the PIN has, so the pad knows when it is complete. */
    journalPinLength: smallint("journal_pin_length"),
    /** Pauses so far (5, 15, then 60 minutes); a correct PIN or the password resets it. */
    journalPinLockouts: smallint("journal_pin_lockouts").notNull().default(0),
    /** When the journal locks again: leaving it, 1 or 5 minutes away, or closing Ledge. */
    journalRelock: text("journal_relock", { enum: JOURNAL_RELOCK }).notNull().default("leave"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("user_settings_week_starts_on_check", sql`${t.weekStartsOn} between 1 and 7`),
    check("user_settings_theme_check", sql`${t.theme} in ('system', 'light', 'dark')`),
    check("user_settings_currency_check", sql`${t.currency} ~ '^[A-Z]{3}$'`),
  ],
);

export type UserSettings = typeof userSettings.$inferSelect;
