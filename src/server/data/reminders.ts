import "server-only";
import { and, asc, eq, gt, isNull } from "drizzle-orm";
import { describeDevice } from "@/modules/account/devices";
import {
  isAllowedPushEndpoint,
  type PushSubscriptionInput,
  type ReminderChoice,
  type ReminderSettingsInput,
} from "@/modules/reminders/schema";
import { db } from "@/server/db/client";
import {
  pushSubscriptions,
  session,
  taskReminders,
  tasks,
  userSettings,
  type PushSubscriptionRow,
  type TaskReminder,
} from "@/server/db/schema";

/**
 * Reminder data (docs/reminders-spec.md §3, §8, §11). Every function takes `userId` and filters by
 * it (CLAUDE.md §5). A task's reminder is reached only through a task the user owns.
 */

async function ownsTask(userId: string, taskId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId), isNull(tasks.deletedAt)));
  return Boolean(row);
}

/** The task's reminder row, or null when it has none or is not this user's. */
export async function getTaskReminder(
  userId: string,
  taskId: string,
): Promise<TaskReminder | null> {
  const [row] = await db
    .select()
    .from(taskReminders)
    .where(and(eq(taskReminders.taskId, taskId), eq(taskReminders.userId, userId)));
  return row ?? null;
}

function sameChoice(row: TaskReminder, choice: ReminderChoice): boolean {
  if (row.kind !== choice.kind) return false;
  if (choice.kind === "before") return row.offsetMinutes === choice.offsetMinutes;
  if (choice.kind === "custom") {
    return (
      row.customDate === choice.date && row.customTime?.slice(0, 5) === choice.time.slice(0, 5)
    );
  }
  return true;
}

/**
 * Sets (creates or replaces) a task's reminder. A changed choice forgets what was sent and any
 * snooze, so it re-arms (§9). Returns null when the task is not this user's.
 */
export async function setTaskReminder(
  userId: string,
  taskId: string,
  choice: ReminderChoice,
): Promise<TaskReminder | null> {
  if (!(await ownsTask(userId, taskId))) return null;
  const values = {
    kind: choice.kind,
    offsetMinutes: choice.kind === "before" ? choice.offsetMinutes : null,
    customDate: choice.kind === "custom" ? choice.date : null,
    customTime: choice.kind === "custom" ? choice.time : null,
  };
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(taskReminders)
      .where(and(eq(taskReminders.taskId, taskId), eq(taskReminders.userId, userId)))
      .for("update");
    if (existing) {
      const changed = !sameChoice(existing, choice);
      const [row] = await tx
        .update(taskReminders)
        .set(changed ? { ...values, sentKey: null, snoozedUntil: null } : values)
        .where(and(eq(taskReminders.id, existing.id), eq(taskReminders.userId, userId)))
        .returning();
      return row;
    }
    const [row] = await tx
      .insert(taskReminders)
      .values({ userId, taskId, ...values })
      .onConflictDoUpdate({
        target: taskReminders.taskId,
        set: { ...values, sentKey: null, snoozedUntil: null },
      })
      .returning();
    return row;
  });
}

/** Removes the task's reminder row. True when one was removed. */
export async function clearTaskReminder(userId: string, taskId: string): Promise<boolean> {
  const rows = await db
    .delete(taskReminders)
    .where(and(eq(taskReminders.taskId, taskId), eq(taskReminders.userId, userId)))
    .returning({ id: taskReminders.id });
  return rows.length > 0;
}

/**
 * Saves a device's push subscription (upsert by endpoint: an endpoint that moved to another
 * account or session is taken over). Returns null when the session is not this user's, or the
 * endpoint is not at a known push service (checked again here: the server posts to it).
 */
export async function saveSubscription(
  userId: string,
  sessionId: string,
  sub: PushSubscriptionInput,
  userAgent: string | null,
): Promise<PushSubscriptionRow | null> {
  if (!isAllowedPushEndpoint(sub.endpoint)) return null;
  const [owned] = await db
    .select({ id: session.id })
    .from(session)
    .where(and(eq(session.id, sessionId), eq(session.userId, userId)));
  if (!owned) return null;
  const values = {
    userId,
    sessionId,
    endpoint: sub.endpoint,
    p256dh: sub.keys.p256dh,
    auth: sub.keys.auth,
    deviceLabel: describeDevice(userAgent).name,
    failures: 0,
  };
  const [row] = await db
    .insert(pushSubscriptions)
    .values(values)
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { ...values, updatedAt: new Date() },
    })
    .returning();
  return row;
}

/** The user's subscriptions whose sign-in session has not expired. */
export async function listLiveSubscriptions(userId: string): Promise<PushSubscriptionRow[]> {
  const rows = await db
    .select({ sub: pushSubscriptions })
    .from(pushSubscriptions)
    .innerJoin(session, eq(session.id, pushSubscriptions.sessionId))
    .where(and(eq(pushSubscriptions.userId, userId), gt(session.expiresAt, new Date())))
    .orderBy(asc(pushSubscriptions.createdAt));
  return rows.map((r) => r.sub);
}

/** Removes one of the user's subscriptions. True when a row was removed. */
export async function deleteSubscription(userId: string, id: string): Promise<boolean> {
  const rows = await db
    .delete(pushSubscriptions)
    .where(and(eq(pushSubscriptions.id, id), eq(pushSubscriptions.userId, userId)))
    .returning({ id: pushSubscriptions.id });
  return rows.length > 0;
}

/** Removes the user's subscription at `endpoint` (another user's is left alone). */
export async function deleteSubscriptionByEndpoint(
  userId: string,
  endpoint: string,
): Promise<boolean> {
  const rows = await db
    .delete(pushSubscriptions)
    .where(and(eq(pushSubscriptions.endpoint, endpoint), eq(pushSubscriptions.userId, userId)))
    .returning({ id: pushSubscriptions.id });
  return rows.length > 0;
}

export type ReminderSettings = {
  reminderDefault: string;
  reminderDefaultSince: Date | null;
  reminderMorningTime: string;
  quietStart: string | null;
  quietEnd: string | null;
};

const settingsColumns = {
  reminderDefault: userSettings.reminderDefault,
  reminderDefaultSince: userSettings.reminderDefaultSince,
  reminderMorningTime: userSettings.reminderMorningTime,
  quietStart: userSettings.quietStart,
  quietEnd: userSettings.quietEnd,
};

export async function getReminderSettings(userId: string): Promise<ReminderSettings | null> {
  const [row] = await db
    .select(settingsColumns)
    .from(userSettings)
    .where(eq(userSettings.userId, userId));
  return row ?? null;
}

/** Saves the reminder settings; `reminderDefaultSince` is set to now whenever the default changes. */
export async function updateReminderSettings(
  userId: string,
  input: ReminderSettingsInput,
): Promise<ReminderSettings | null> {
  const current = await getReminderSettings(userId);
  if (!current) return null;
  const changed = current.reminderDefault !== input.reminderDefault;
  const [row] = await db
    .update(userSettings)
    .set({
      reminderDefault: input.reminderDefault,
      reminderMorningTime: input.reminderMorningTime,
      quietStart: input.quietStart,
      quietEnd: input.quietEnd,
      ...(changed ? { reminderDefaultSince: new Date() } : {}),
    })
    .where(eq(userSettings.userId, userId))
    .returning(settingsColumns);
  return row ?? null;
}
