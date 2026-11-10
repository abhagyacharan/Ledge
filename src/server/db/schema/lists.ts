import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "./_columns";
import { user } from "./auth";

export const VIEW_MODES = ["list", "board"] as const;
export type ViewMode = (typeof VIEW_MODES)[number];

export const lists = pgTable(
  "lists",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color"),
    /** A single emoji. */
    icon: text("icon"),
    description: text("description"),
    /** Optional target date: this is how goals are modelled in v0.1 (CLAUDE.md §6.1). */
    targetDate: date("target_date", { mode: "string" }),
    isInbox: boolean("is_inbox").notNull().default(false),
    isArchived: boolean("is_archived").notNull().default(false),
    /** Fractional-index string (CLAUDE.md §3). */
    position: text("position").notNull(),
    viewMode: text("view_mode", { enum: VIEW_MODES }).notNull().default("list"),
    /** Sort, group and filter choices for this list (CLAUDE.md §6.2). */
    viewSettings: jsonb("view_settings").notNull().default({}),
    /** Soft delete: set means the list (and, with it, its tasks) is in Trash. */
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("lists_user_position_idx").on(t.userId, t.position),
    // Exactly one Inbox per user, enforced by the database.
    uniqueIndex("lists_one_inbox_per_user_idx")
      .on(t.userId)
      .where(sql`${t.isInbox}`),
    // Lets child tables reference (id, user_id) so a row can never point at another user's list.
    unique("lists_id_user_id_key").on(t.id, t.userId),
    check("lists_name_check", sql`char_length(${t.name}) between 1 and 100`),
    check("lists_view_mode_check", sql`${t.viewMode} in ('list', 'board')`),
    check("lists_inbox_not_archived_check", sql`not (${t.isInbox} and ${t.isArchived})`),
    check("lists_inbox_not_trashed_check", sql`not (${t.isInbox} and ${t.deletedAt} is not null)`),
  ],
);

export type List = typeof lists.$inferSelect;
export type NewList = typeof lists.$inferInsert;
