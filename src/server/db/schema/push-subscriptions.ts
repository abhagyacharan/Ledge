import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "./_columns";
import { session, user } from "./auth";

/**
 * One browser on one device that turned reminders on (docs/reminders-spec.md §8, §11). Tied to the
 * sign-in session that created it: when that session ends, the row goes, so a signed-out phone
 * stops receiving task titles.
 */
export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => session.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull().unique(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    deviceLabel: text("device_label").notNull(),
    /** Failed sends in a row; five delete the row. */
    failures: integer("failures").notNull().default(0),
    lastSuccessAt: timestamp("last_success_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("push_subscriptions_user_idx").on(t.userId),
    index("push_subscriptions_session_idx").on(t.sessionId),
  ],
);

export type PushSubscriptionRow = typeof pushSubscriptions.$inferSelect;
