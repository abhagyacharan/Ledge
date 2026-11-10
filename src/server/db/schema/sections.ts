import { sql } from "drizzle-orm";
import { check, foreignKey, index, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "./_columns";
import { user } from "./auth";
import { lists } from "./lists";

export const sections = pgTable(
  "sections",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    listId: uuid("list_id").notNull(),
    name: text("name").notNull(),
    position: text("position").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    // Composite FK: the list must belong to the same user as the section.
    foreignKey({
      name: "sections_list_owner_fk",
      columns: [t.listId, t.userId],
      foreignColumns: [lists.id, lists.userId],
    }).onDelete("cascade"),
    index("sections_user_list_position_idx").on(t.userId, t.listId, t.position),
    unique("sections_id_user_id_key").on(t.id, t.userId),
    check("sections_name_check", sql`char_length(${t.name}) between 1 and 100`),
  ],
);

export type Section = typeof sections.$inferSelect;
export type NewSection = typeof sections.$inferInsert;
