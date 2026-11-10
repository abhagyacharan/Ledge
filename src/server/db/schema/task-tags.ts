import { foreignKey, index, pgTable, primaryKey, uuid } from "drizzle-orm/pg-core";
import { createdAt } from "./_columns";
import { user } from "./auth";
import { tags } from "./tags";
import { tasks } from "./tasks";

export const taskTags = pgTable(
  "task_tags",
  {
    taskId: uuid("task_id").notNull(),
    tagId: uuid("tag_id").notNull(),
    // Not in the §6.3 sketch, but every user-owned table carries user_id (§6.3 preamble).
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ name: "task_tags_pkey", columns: [t.taskId, t.tagId] }),
    // Composite FKs: the task and the tag must both belong to the same user as this row.
    foreignKey({
      name: "task_tags_task_owner_fk",
      columns: [t.taskId, t.userId],
      foreignColumns: [tasks.id, tasks.userId],
    }).onDelete("cascade"),
    foreignKey({
      name: "task_tags_tag_owner_fk",
      columns: [t.tagId, t.userId],
      foreignColumns: [tags.id, tags.userId],
    }).onDelete("cascade"),
    index("task_tags_user_tag_idx").on(t.userId, t.tagId),
  ],
);

export type TaskTag = typeof taskTags.$inferSelect;
