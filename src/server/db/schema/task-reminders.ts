import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  integer,
  pgTable,
  text,
  time,
  timestamp,
  date,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "./_columns";
import { user } from "./auth";
import { tasks } from "./tasks";

export const REMINDER_KINDS = ["none", "at_due", "before", "custom"] as const;
export type ReminderKind = (typeof REMINDER_KINDS)[number];

/** Minutes a "before" reminder may be set ahead: 5, 10, 15, 30 min, 1 h, 2 h, 1 day. */
export const REMINDER_OFFSETS = [5, 10, 15, 30, 60, 120, 1440] as const;

/**
 * A task's reminder choice (docs/reminders-spec.md §3, §11). It stores what was chosen, not a
 * moment: the scheduler works the moment out on every tick, so moving the due date moves it.
 */
export const taskReminders = pgTable(
  "task_reminders",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    taskId: uuid("task_id").notNull(),
    kind: text("kind", { enum: REMINDER_KINDS }).notNull(),
    /** Only with `before`. */
    offsetMinutes: integer("offset_minutes"),
    /** Only with `custom`: floating date and time, read in the user's timezone. */
    customDate: date("custom_date", { mode: "string" }),
    customTime: time("custom_time"),
    /** Identifies the round last sent, so a reminder never goes out twice (§9). */
    sentKey: text("sent_key"),
    snoozedUntil: timestamp("snoozed_until", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    foreignKey({
      name: "task_reminders_task_owner_fk",
      columns: [t.taskId, t.userId],
      foreignColumns: [tasks.id, tasks.userId],
    }).onDelete("cascade"),
    unique("task_reminders_task_id_key").on(t.taskId),
    check("task_reminders_kind_check", sql`${t.kind} in ('none', 'at_due', 'before', 'custom')`),
    check(
      "task_reminders_offset_check",
      sql`(${t.kind} = 'before' and ${t.offsetMinutes} in (5, 10, 15, 30, 60, 120, 1440)) or (${t.kind} <> 'before' and ${t.offsetMinutes} is null)`,
    ),
    check(
      "task_reminders_custom_check",
      sql`(${t.kind} = 'custom' and ${t.customDate} is not null and ${t.customTime} is not null) or (${t.kind} <> 'custom' and ${t.customDate} is null and ${t.customTime} is null)`,
    ),
  ],
);

export type TaskReminder = typeof taskReminders.$inferSelect;
