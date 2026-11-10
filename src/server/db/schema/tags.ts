import { sql } from "drizzle-orm";
import { check, pgTable, text, unique, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "./_columns";
import { user } from "./auth";

export const tags = pgTable(
  "tags",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    // Case-insensitive unique per user ("Home" and "home" are the same tag).
    uniqueIndex("tags_user_name_lower_idx").on(t.userId, sql`lower(${t.name})`),
    unique("tags_id_user_id_key").on(t.id, t.userId),
    check("tags_name_check", sql`char_length(${t.name}) between 1 and 50`),
  ],
);

export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;
