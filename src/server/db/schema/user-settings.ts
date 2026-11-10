import { sql } from "drizzle-orm";
import { check, pgTable, smallint, text, uuid } from "drizzle-orm/pg-core";
import { createdAt, updatedAt } from "./_columns";
import { user } from "./auth";

export const THEMES = ["system", "light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

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
