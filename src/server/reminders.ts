import "server-only";
import {
  and,
  between,
  eq,
  exists,
  gt,
  inArray,
  isNotNull,
  isNull,
  lte,
  ne,
  or,
  sql,
} from "drizzle-orm";
import { todayIn, trimTime } from "@/lib/dates";
import {
  effectiveChoice,
  reminderBody,
  reminderMoment,
  roundKey,
  sendDecision,
  SNOOZE_MS,
  snoozeTooOld,
} from "@/modules/reminders/reminder-time";
import type { ReminderChoice } from "@/modules/reminders/schema";
import { db } from "@/server/db/client";
import {
  lists,
  pushSubscriptions,
  session,
  taskReminders,
  tasks,
  userSettings,
  type TaskReminder,
} from "@/server/db/schema";
import { getUserSettings } from "@/server/data/settings";
import { completeRecurringTask, getTask, setTaskDone } from "@/server/data/tasks";
import { pushConfigured, sendToUser, type PushPayload } from "@/server/push";

/**
 * The reminder scheduler (docs/reminders-spec.md §9). Every 30 seconds a tick works out each
 * candidate reminder's moment from what was chosen, claims the round in the database so it is
 * sent once even with two processes or overlapping ticks, then sends it with Web Push.
 */

const DAY = 86_400_000;
export const TICK_MS = 30_000;

export type TickCounts = {
  /** Tasks looked at. */
  considered: number;
  /** Reminders claimed and handed to the push sender (snoozes included). */
  sent: number;
  /** Of those, sent late (the app was away when the moment came). */
  late: number;
  /** Claimed without a notification: more than six hours late. */
  skipped: number;
  /** Snoozes sent (also counted in `sent`). */
  snoozed: number;
  /** Reminders that failed to claim or send. */
  errors: number;
};

function utcDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function rowChoice(
  row: Pick<TaskReminder, "kind" | "offsetMinutes" | "customDate" | "customTime">,
) {
  switch (row.kind) {
    case "at_due":
      return { kind: "at_due" } satisfies ReminderChoice;
    case "before":
      return { kind: "before", offsetMinutes: row.offsetMinutes ?? 0 } satisfies ReminderChoice;
    case "custom":
      return {
        kind: "custom",
        date: row.customDate ?? "",
        time: trimTime(row.customTime ?? "00:00"),
      } satisfies ReminderChoice;
    default:
      return { kind: "none" } satisfies ReminderChoice;
  }
}

/** A user with at least one subscription whose sign-in session is still live. */
const hasLiveSubscription = (now: Date) =>
  exists(
    db
      .select({ one: sql`1` })
      .from(pushSubscriptions)
      .innerJoin(session, eq(session.id, pushSubscriptions.sessionId))
      .where(and(eq(pushSubscriptions.userId, tasks.userId), gt(session.expiresAt, now))),
  );

async function loadCandidates(now: Date) {
  const lo = utcDate(now.getTime() - 2 * DAY);
  const hi = utcDate(now.getTime() + 2 * DAY);
  const due = between(tasks.dueDate, lo, hi);
  return db
    .select({
      taskId: tasks.id,
      userId: tasks.userId,
      title: tasks.title,
      dueDate: tasks.dueDate,
      dueTime: tasks.dueTime,
      taskCreatedAt: tasks.createdAt,
      taskUpdatedAt: tasks.updatedAt,
      listName: lists.name,
      timezone: userSettings.timezone,
      locale: userSettings.locale,
      reminderDefault: userSettings.reminderDefault,
      reminderDefaultSince: userSettings.reminderDefaultSince,
      morningTime: userSettings.reminderMorningTime,
      quietStart: userSettings.quietStart,
      quietEnd: userSettings.quietEnd,
      reminder: {
        id: taskReminders.id,
        kind: taskReminders.kind,
        offsetMinutes: taskReminders.offsetMinutes,
        customDate: taskReminders.customDate,
        customTime: taskReminders.customTime,
        sentKey: taskReminders.sentKey,
        snoozedUntil: taskReminders.snoozedUntil,
        updatedAt: taskReminders.updatedAt,
      },
    })
    .from(tasks)
    .innerJoin(lists, and(eq(lists.id, tasks.listId), isNull(lists.deletedAt)))
    .innerJoin(userSettings, eq(userSettings.userId, tasks.userId))
    .leftJoin(
      taskReminders,
      and(eq(taskReminders.taskId, tasks.id), eq(taskReminders.userId, tasks.userId)),
    )
    .where(
      and(
        eq(tasks.status, "open"),
        isNull(tasks.deletedAt),
        hasLiveSubscription(now),
        or(
          and(isNotNull(taskReminders.snoozedUntil), lte(taskReminders.snoozedUntil, now)),
          and(inArray(taskReminders.kind, ["at_due", "before"]), due),
          and(eq(taskReminders.kind, "custom"), between(taskReminders.customDate, lo, hi)),
          and(
            isNull(taskReminders.id),
            isNotNull(tasks.dueTime),
            due,
            ne(userSettings.reminderDefault, "none"),
            isNotNull(userSettings.reminderDefaultSince),
            gt(tasks.createdAt, userSettings.reminderDefaultSince),
          ),
        ),
      ),
    );
}

type Candidate = Awaited<ReturnType<typeof loadCandidates>>[number];

/** Marks a reminder row's round as sent. True only for the one caller that won the claim. */
async function claimRow(userId: string, reminderId: string, key: string): Promise<boolean> {
  const rows = await db
    .update(taskReminders)
    .set({ sentKey: key })
    .where(
      and(
        eq(taskReminders.id, reminderId),
        eq(taskReminders.userId, userId),
        sql`${taskReminders.sentKey} is distinct from ${key}`,
      ),
    )
    .returning({ id: taskReminders.id });
  return rows.length > 0;
}

/**
 * A default reminder has no row yet: the claim inserts one holding the default's choice. A row
 * the person made in the meantime with another choice (None, say) is left alone.
 */
async function claimDefault(
  userId: string,
  taskId: string,
  choice: ReminderChoice,
  key: string,
): Promise<boolean> {
  if (choice.kind !== "at_due" && choice.kind !== "before") return false;
  const offsetMinutes = choice.kind === "before" ? choice.offsetMinutes : null;
  const rows = await db
    .insert(taskReminders)
    .values({ userId, taskId, kind: choice.kind, offsetMinutes, sentKey: key })
    .onConflictDoUpdate({
      target: taskReminders.taskId,
      set: { sentKey: key, updatedAt: new Date() },
      setWhere: sql`${taskReminders.sentKey} is distinct from ${key}
        and ${taskReminders.userId} = ${userId}
        and ${taskReminders.kind} = ${choice.kind}
        and ${taskReminders.offsetMinutes} is not distinct from ${offsetMinutes}::int`,
    })
    .returning({ id: taskReminders.id });
  return rows.length > 0;
}

/** Clears a snooze that has come due. True only for the caller that won the claim. */
async function claimSnooze(
  userId: string,
  reminderId: string,
  now: Date,
  key: string | null,
): Promise<boolean> {
  const rows = await db
    .update(taskReminders)
    .set(key ? { snoozedUntil: null, sentKey: key } : { snoozedUntil: null })
    .where(
      and(
        eq(taskReminders.id, reminderId),
        eq(taskReminders.userId, userId),
        lte(taskReminders.snoozedUntil, now),
      ),
    )
    .returning({ id: taskReminders.id });
  return rows.length > 0;
}

function payloadFor(c: Candidate, now: Date, held: boolean, late: boolean): PushPayload {
  return {
    type: "reminder",
    taskId: c.taskId,
    title: c.title,
    body: reminderBody({
      dueDate: c.dueDate,
      dueTime: c.dueTime,
      listName: c.listName,
      held,
      now,
      timeZone: c.timezone,
      locale: c.locale,
    }),
    url: `/today?task=${c.taskId}`,
    tag: c.taskId,
    late,
  };
}

function choiceFor(c: Candidate): ReminderChoice {
  return effectiveChoice({
    own: c.reminder ? rowChoice(c.reminder) : null,
    reminderDefault: c.reminderDefault,
    reminderDefaultSince: c.reminderDefaultSince,
    taskCreatedAt: c.taskCreatedAt,
    dueTime: c.dueTime,
  });
}

async function handle(c: Candidate, now: Date, counts: TickCounts): Promise<void> {
  const choice = choiceFor(c);
  const moment = reminderMoment({
    taskId: c.taskId,
    dueDate: c.dueDate,
    dueTime: c.dueTime,
    choice,
    morningTime: c.morningTime,
    timeZone: c.timezone,
    quietStart: c.quietStart,
    quietEnd: c.quietEnd,
  });

  // A snooze that has come due sends the same reminder again (§7), whatever the choice.
  const reminder = c.reminder;
  if (reminder?.snoozedUntil && reminder.snoozedUntil.getTime() <= now.getTime()) {
    const key = moment?.key ?? null;
    if (!(await claimSnooze(c.userId, reminder.id, now, key))) return;
    if (snoozeTooOld(now, reminder.snoozedUntil)) {
      counts.skipped += 1;
      return;
    }
    await sendToUser(c.userId, payloadFor(c, now, false, false));
    counts.sent += 1;
    counts.snoozed += 1;
    return;
  }

  if (!moment) return;
  if (reminder && reminder.sentKey === moment.key) return;
  const changedTimes = [c.taskUpdatedAt, reminder?.updatedAt].filter(
    (d): d is Date => d instanceof Date,
  );
  const changedAt =
    changedTimes.length > 0 ? new Date(Math.max(...changedTimes.map((d) => d.getTime()))) : null;
  const decision = sendDecision(now, moment.at, changedAt);
  if (decision.action === "wait") return;

  const won = reminder
    ? await claimRow(c.userId, reminder.id, moment.key)
    : await claimDefault(c.userId, c.taskId, choice, moment.key);
  if (!won) return;
  if (decision.action === "skip") {
    counts.skipped += 1;
    return;
  }
  await sendToUser(c.userId, payloadFor(c, now, moment.held, decision.late));
  counts.sent += 1;
  if (decision.late) counts.late += 1;
}

/** Errors are logged by kind only: a database error's text could carry task details. */
function logSafely(context: string, error: unknown) {
  const cause = (error as { cause?: { code?: unknown } } | null)?.cause;
  const code = typeof cause?.code === "string" ? ` (${cause.code})` : "";
  const name = error instanceof Error ? error.name : typeof error;
  console.error(`${context}: ${name}${code}`);
}

/**
 * One pass of the scheduler at `now` (injectable for tests). Safe to run twice at once: each
 * round is claimed in the database before it is sent.
 */
export async function runReminderTick(now: Date): Promise<TickCounts> {
  const counts: TickCounts = { considered: 0, sent: 0, late: 0, skipped: 0, snoozed: 0, errors: 0 };
  if (!pushConfigured()) return counts;
  const candidates = await loadCandidates(now);
  counts.considered = candidates.length;
  await Promise.all(
    candidates.map(async (c) => {
      try {
        await handle(c, now, counts);
      } catch (error) {
        counts.errors += 1;
        logSafely("Reminder failed", error);
      }
    }),
  );
  return counts;
}

type SchedulerGlobal = typeof globalThis & {
  __ledgeReminderScheduler?: ReturnType<typeof setInterval>;
};

/**
 * Starts the 30-second tick, once per process (instrumentation.ts). A tick still running when the
 * next is due is not overlapped; the next one simply waits for the following interval.
 */
export function startReminderScheduler(intervalMs: number = TICK_MS): void {
  const g = globalThis as SchedulerGlobal;
  if (g.__ledgeReminderScheduler) return;
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      await runReminderTick(new Date());
    } catch (error) {
      logSafely("Reminder tick failed", error);
    } finally {
      running = false;
    }
  };
  const timer = setInterval(() => void run(), intervalMs);
  // Never keep the process alive just for reminders.
  timer.unref?.();
  g.__ledgeReminderScheduler = timer;
  void run();
}

/** Stops the scheduler (tests and hot reload). */
export function stopReminderScheduler(): void {
  const g = globalThis as SchedulerGlobal;
  if (g.__ledgeReminderScheduler) clearInterval(g.__ledgeReminderScheduler);
  g.__ledgeReminderScheduler = undefined;
}

export type ReminderDoneResult = "done" | "not_found" | "too_early";

/**
 * Done from a notification (§7): the same path as ticking the task in the app. A repeating task
 * moves to its next round; a repeat whose day has not come is refused, never ticked ahead.
 */
export async function completeFromReminder(
  userId: string,
  taskId: string,
  now: Date,
): Promise<ReminderDoneResult> {
  const task = await getTask(userId, taskId);
  if (!task) return "not_found";
  if (task.status === "done") return "done";
  const { timezone } = await getUserSettings(userId);
  const today = todayIn(timezone, now);
  if (task.recurrenceRule && !task.parentId && task.dueDate && task.dueDate > today) {
    return "too_early";
  }
  // A pending snooze must not ring for the next round.
  await db
    .update(taskReminders)
    .set({ snoozedUntil: null })
    .where(and(eq(taskReminders.taskId, taskId), eq(taskReminders.userId, userId)));
  if (await completeRecurringTask(userId, taskId, today)) return "done";
  return (await setTaskDone(userId, taskId, true)) ? "done" : "not_found";
}

/**
 * Snooze from a notification (§7): the same reminder again in ten minutes. A task reminded by
 * the default gets a row holding the default's choice; this round stays marked as sent. Returns
 * when it will ring again, or null when the task is not this user's open task.
 */
export async function snoozeReminder(
  userId: string,
  taskId: string,
  now: Date,
): Promise<Date | null> {
  const task = await getTask(userId, taskId);
  if (!task || task.status !== "open") return null;
  const until = new Date(now.getTime() + SNOOZE_MS);
  const updated = await db
    .update(taskReminders)
    .set({ snoozedUntil: until })
    .where(and(eq(taskReminders.taskId, taskId), eq(taskReminders.userId, userId)))
    .returning({ id: taskReminders.id });
  if (updated.length > 0) return until;

  const settings = await getUserSettings(userId);
  const choice = effectiveChoice({
    own: null,
    reminderDefault: settings.reminderDefault,
    reminderDefaultSince: settings.reminderDefaultSince,
    taskCreatedAt: task.createdAt,
    dueTime: task.dueTime,
  });
  const values =
    choice.kind === "at_due" || choice.kind === "before"
      ? {
          kind: choice.kind,
          offsetMinutes: choice.kind === "before" ? choice.offsetMinutes : null,
          sentKey: roundKey(task.id, task.dueDate, task.dueTime, choice),
        }
      : { kind: "none" as const, offsetMinutes: null, sentKey: null };
  await db
    .insert(taskReminders)
    .values({ userId, taskId, ...values, snoozedUntil: until })
    .onConflictDoUpdate({ target: taskReminders.taskId, set: { snoozedUntil: until } });
  return until;
}
