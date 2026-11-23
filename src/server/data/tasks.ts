import "server-only";
import { and, asc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { positionAtEnd, positionBetween } from "@/lib/ordering";
import { nextDueDate, parseRule, type RecurrenceMode } from "@/lib/recurrence";
import { todayIn } from "@/lib/dates";
import { rowToChoice } from "@/modules/reminders/reminder-time";
import { hasActiveReminder } from "@/modules/todos/reminders";
import { db } from "@/server/db/client";
import { lists, plans, taskReminders, tasks, type Task } from "@/server/db/schema";
import { getPushConfig } from "@/server/env";
import { getInbox, getList, trashList } from "./lists";
import { getReminderSettings, getTaskReminder, setTaskReminder } from "./reminders";
import { getUserSettings } from "./settings";

/**
 * Data functions for tasks. Every function takes the authenticated `userId` and filters by it
 * (CLAUDE.md §5). Someone else's task looks exactly like a task that does not exist.
 *
 * "Active" means: not in Trash itself, and its list is not in Trash either. Reads only return
 * active tasks. Trashing a task also trashes its subtasks, with the same timestamp, so that
 * restoring brings back exactly the rows that were trashed together.
 */

/** A task as the screens show it. `hasReminder` is set by the list and view queries (the bell). */
export type TaskRow = Task & { hasReminder?: boolean };

/**
 * Adds `hasReminder` to rows: an open task with a reminder (its own, or the Settings default for
 * a task with a time created after the default last changed) for a date that has not passed.
 * Always false when push is not set up. One query for the user's reminder rows, none per task.
 */
export async function withReminderFlags<T extends Task>(
  userId: string,
  rows: T[],
): Promise<(T & { hasReminder: boolean })[]> {
  if (rows.length === 0 || !getPushConfig()) {
    return rows.map((r) => ({ ...r, hasReminder: false }));
  }
  const [reminders, reminderSettings, settings] = await Promise.all([
    db
      .select()
      .from(taskReminders)
      .where(
        and(
          eq(taskReminders.userId, userId),
          inArray(
            taskReminders.taskId,
            rows.map((r) => r.id),
          ),
        ),
      ),
    getReminderSettings(userId),
    getUserSettings(userId),
  ]);
  const byTask = new Map(reminders.map((r) => [r.taskId, r]));
  const defaults = {
    reminderDefault: reminderSettings?.reminderDefault ?? "none",
    reminderDefaultSince: reminderSettings?.reminderDefaultSince ?? null,
  };
  const today = todayIn(settings.timezone);
  return rows.map((r) => ({
    ...r,
    hasReminder: hasActiveReminder(r, byTask.get(r.id) ?? null, defaults, today),
  }));
}

export type TaskPatch = {
  title?: string;
  notes?: string | null;
  priority?: number;
  dueDate?: string | null;
  dueTime?: string | null;
  /** Canonical rule text (src/lib/recurrence.ts) or null to stop repeating. */
  recurrenceRule?: string | null;
  recurrenceMode?: RecurrenceMode;
  /** Last day the repeat may fall on, or null for no end. */
  recurrenceUntil?: string | null;
};

/** The task's list has not been moved to Trash. */
const listIsActive = sql`exists (select 1 from ${lists} where ${lists.id} = ${tasks.listId} and ${lists.deletedAt} is null)`;

const activeTask = (userId: string, taskId: string) =>
  and(eq(tasks.userId, userId), eq(tasks.id, taskId), isNull(tasks.deletedAt), listIsActive);

/** Active tasks in a list (top level and subtasks, open and done), in position order. */
export async function listTasksInList(userId: string, listId: string): Promise<Task[]> {
  return db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        eq(tasks.listId, listId),
        isNull(tasks.deletedAt),
        listIsActive,
      ),
    )
    .orderBy(asc(tasks.position));
}

export async function getListTasks(userId: string, listId: string): Promise<TaskRow[]> {
  return withReminderFlags(userId, await listTasksInList(userId, listId));
}

export async function getTask(userId: string, taskId: string): Promise<Task | null> {
  const [row] = await db.select().from(tasks).where(activeTask(userId, taskId));
  return row ?? null;
}

/** A task and its subtasks (for the detail drawer). */
export async function getTaskDetail(
  userId: string,
  taskId: string,
): Promise<{ task: TaskRow; subtasks: TaskRow[] } | null> {
  const found = await getTask(userId, taskId);
  if (!found) return null;
  const [task] = await withReminderFlags(userId, [found]);
  const subtasks = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.userId, userId), eq(tasks.parentId, taskId), isNull(tasks.deletedAt)))
    .orderBy(asc(tasks.position));
  return { task, subtasks };
}

async function lastPositionInGroup(
  userId: string,
  listId: string,
  parentId: string | null,
): Promise<string | null> {
  const rows = await db
    .select({ position: tasks.position })
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        eq(tasks.listId, listId),
        parentId ? eq(tasks.parentId, parentId) : isNull(tasks.parentId),
      ),
    );
  // Compare as plain strings, the same way the fractional-index library does.
  return rows.reduce<string | null>(
    (max, r) => (max === null || r.position > max ? r.position : max),
    null,
  );
}

export type NewTaskInput = {
  listId: string;
  title: string;
  parentId?: string | null;
  notes?: string | null;
  priority?: number;
  dueDate?: string | null;
  dueTime?: string | null;
  recurrenceRule?: string | null;
  recurrenceMode?: RecurrenceMode;
  recurrenceUntil?: string | null;
  /** The plan this task belongs to (docs/plans-module-spec.md) and the phase of it. Top-level tasks only. */
  planId?: string | null;
  planPhase?: string | null;
};

/**
 * Creates a task at the end of its list (or of its parent's subtasks). Returns null when the list,
 * parent is not the user's, or when the parent is itself a subtask.
 * A subtask always lives in its parent's list.
 */
export async function createTask(userId: string, input: NewTaskInput): Promise<Task | null> {
  let listId = input.listId;
  const parentId = input.parentId ?? null;

  if (parentId) {
    const parent = await getTask(userId, parentId);
    if (!parent || parent.parentId) return null;
    listId = parent.listId;
  } else {
    if (!(await getList(userId, listId))) return null;
  }

  // A plan link must point at one of this user's plans (and only top-level tasks carry it).
  let planId: string | null = null;
  if (input.planId && !parentId) {
    const [own] = await db
      .select({ id: plans.id })
      .from(plans)
      .where(and(eq(plans.id, input.planId), eq(plans.userId, userId)));
    if (!own) return null;
    planId = own.id;
  }

  const dueDate = input.dueDate ?? null;
  const recurrenceRule = input.recurrenceRule ?? null;
  // A repeat needs a due date, a top-level task and a rule we understand.
  if (recurrenceRule && (!dueDate || parentId || !parseRule(recurrenceRule))) return null;
  // An end date only goes with a repeat, and cannot come before the first date.
  const recurrenceUntil = recurrenceRule ? (input.recurrenceUntil ?? null) : null;
  if (recurrenceUntil && dueDate && recurrenceUntil < dueDate) return null;
  const [row] = await db
    .insert(tasks)
    .values({
      userId,
      listId,
      parentId,
      title: input.title,
      notes: input.notes ?? null,
      priority: input.priority ?? 0,
      dueDate,
      dueTime: dueDate ? (input.dueTime ?? null) : null,
      recurrenceRule,
      recurrenceMode: input.recurrenceMode ?? "fixed",
      recurrenceUntil,
      planId,
      planPhase: planId ? (input.planPhase?.slice(0, 40) ?? null) : null,
      position: positionAtEnd(await lastPositionInGroup(userId, listId, parentId)),
    })
    .returning();
  return row;
}

/**
 * Updates fields of a task. Clearing the due date also clears the due time. Returns null when the
 * task is not the user's, or the repeat rule cannot apply.
 */
export async function updateTask(
  userId: string,
  taskId: string,
  patch: TaskPatch,
): Promise<Task | null> {
  const current = await getTask(userId, taskId);
  if (!current) return null;

  const set: Partial<typeof tasks.$inferInsert> = {};
  if (patch.title !== undefined) set.title = patch.title;
  if (patch.notes !== undefined) set.notes = patch.notes;
  if (patch.priority !== undefined) set.priority = patch.priority;
  if (patch.dueDate !== undefined) {
    set.dueDate = patch.dueDate;
    if (patch.dueDate === null) set.dueTime = null;
  }
  if (patch.dueTime !== undefined && patch.dueDate !== null) {
    const effectiveDate = patch.dueDate ?? current.dueDate;
    set.dueTime = effectiveDate ? patch.dueTime : null;
  }
  if (patch.recurrenceRule !== undefined) {
    if (patch.recurrenceRule !== null) {
      // Only a top-level task with a due date can repeat, and the rule must be one we understand.
      const effectiveDue = patch.dueDate === undefined ? current.dueDate : patch.dueDate;
      if (current.parentId || !effectiveDue || !parseRule(patch.recurrenceRule)) return null;
    }
    set.recurrenceRule = patch.recurrenceRule;
    if (patch.recurrenceRule === null) set.recurrenceUntil = null; // no repeat, nothing to end
  } else if (patch.dueDate === null && current.recurrenceRule) {
    set.recurrenceRule = null; // a repeating task with no date has nothing to repeat from
    set.recurrenceUntil = null;
  }
  if (patch.recurrenceMode !== undefined) set.recurrenceMode = patch.recurrenceMode;
  if (patch.recurrenceUntil !== undefined && set.recurrenceRule !== null) {
    const effectiveRule =
      patch.recurrenceRule === undefined ? current.recurrenceRule : patch.recurrenceRule;
    const effectiveDue = patch.dueDate === undefined ? current.dueDate : patch.dueDate;
    if (patch.recurrenceUntil !== null) {
      // An end date needs a repeat, and cannot come before the date it starts from.
      if (!effectiveRule || (effectiveDue && patch.recurrenceUntil < effectiveDue)) return null;
    }
    set.recurrenceUntil = patch.recurrenceUntil;
  }
  if (Object.keys(set).length === 0) return current;

  const [row] = await db.update(tasks).set(set).where(activeTask(userId, taskId)).returning();
  return row ?? null;
}

export type RecurringCompletion = {
  /** The finished copy that now sits in Completed. */
  snapshotId: string;
  previousDueDate: string | null;
  previousDueTime: string | null;
  nextDueDate: string;
  /** Subtasks that were done and were reopened for the next round. */
  reopenedSubtaskIds: string[];
};

/** Thrown by `completeRecurringTask` with `exclusive` when another call finished the round first. */
export class RecurringRoundTaken extends Error {
  constructor() {
    super("This round was already finished");
    this.name = "RecurringRoundTaken";
  }
}

/**
 * Completing a repeating task (CLAUDE.md §6.2): a finished copy ("snapshot", pointing back at the
 * task through `recurrence_origin_id`) is added to Completed, and the task itself stays open with
 * its due date moved to the next date. Its done subtasks are reopened. Returns null when the task is not the user's, is not a repeating open task, or the rule is
 * not understood (then the caller completes it like any other task).
 *
 * With `exclusive` (the notification's Done) the due date only moves if it is still the one read
 * here, so two presses at once finish one round: the second throws `RecurringRoundTaken` and its
 * copy is rolled back.
 */
export async function completeRecurringTask(
  userId: string,
  taskId: string,
  completedOn: string,
  options: { exclusive?: boolean } = {},
): Promise<RecurringCompletion | null> {
  const task = await getTask(userId, taskId);
  if (!task || task.status !== "open" || task.parentId || !task.recurrenceRule) return null;
  const rule = parseRule(task.recurrenceRule);
  if (!rule) return null;
  const nextDue = nextDueDate({
    rule,
    mode: task.recurrenceMode,
    dueDate: task.dueDate,
    completedOn,
  });
  // The repeat has run its course: finish the task like any other (the caller does that).
  if (task.recurrenceUntil && nextDue > task.recurrenceUntil) return null;

  return db.transaction(async (tx) => {
    const [snapshot] = await tx
      .insert(tasks)
      .values({
        userId,
        listId: task.listId,
        title: task.title,
        notes: task.notes,
        priority: task.priority,
        status: "done",
        completedAt: new Date(),
        dueDate: task.dueDate,
        dueTime: task.dueTime,
        recurrenceOriginId: task.id,
        position: task.position,
      })
      .returning({ id: tasks.id });

    const reopened = await tx
      .update(tasks)
      .set({ status: "open", completedAt: null })
      .where(
        and(
          eq(tasks.userId, userId),
          eq(tasks.parentId, task.id),
          eq(tasks.status, "done"),
          isNull(tasks.deletedAt),
        ),
      )
      .returning({ id: tasks.id });

    const advanced = await tx
      .update(tasks)
      .set({ dueDate: nextDue })
      .where(
        and(
          eq(tasks.userId, userId),
          eq(tasks.id, task.id),
          options.exclusive
            ? and(
                eq(tasks.status, "open"),
                sql`${tasks.dueDate} is not distinct from ${task.dueDate}`,
              )
            : undefined,
        ),
      )
      .returning({ id: tasks.id });
    // Someone else finished this round first: take back the copy made here.
    if (options.exclusive && advanced.length === 0) throw new RecurringRoundTaken();

    return {
      snapshotId: snapshot.id,
      previousDueDate: task.dueDate,
      previousDueTime: task.dueTime,
      nextDueDate: nextDue,
      reopenedSubtaskIds: reopened.map((r) => r.id),
    };
  });
}

/**
 * Undo for `completeRecurringTask`: removes the finished copy, puts the old due date back and
 * marks the reopened subtasks done again. Only works on this user's own snapshot of this task.
 */
export async function undoRecurringCompletion(
  userId: string,
  input: {
    taskId: string;
    snapshotId: string;
    previousDueDate: string | null;
    previousDueTime: string | null;
    reopenedSubtaskIds: string[];
  },
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const removed = await tx
      .delete(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          eq(tasks.id, input.snapshotId),
          eq(tasks.recurrenceOriginId, input.taskId),
          eq(tasks.status, "done"),
        ),
      )
      .returning({ id: tasks.id });
    if (removed.length === 0) return false;

    await tx
      .update(tasks)
      .set({ dueDate: input.previousDueDate, dueTime: input.previousDueTime })
      .where(and(eq(tasks.userId, userId), eq(tasks.id, input.taskId)));

    if (input.reopenedSubtaskIds.length > 0) {
      for (const id of input.reopenedSubtaskIds) {
        await tx
          .update(tasks)
          .set({ status: "done", completedAt: new Date() })
          .where(and(eq(tasks.userId, userId), eq(tasks.id, id), eq(tasks.parentId, input.taskId)));
      }
    }
    return true;
  });
}

/**
 * Unticking the finished copy of a repeating task (O, 2026-11-22): it undoes that round instead of
 * leaving a loose copy behind. The copy is removed and, if the task had moved past the copy's
 * date, it goes back to that date. Returns false when `copyId` is not this user's finished copy
 * of a repeating task that still exists (the caller then reopens it like any other task).
 */
export async function reopenRecurringCopy(userId: string, copyId: string): Promise<boolean> {
  const copy = await getTask(userId, copyId);
  if (!copy || copy.status !== "done" || !copy.recurrenceOriginId) return false;
  const origin = await getTask(userId, copy.recurrenceOriginId);
  if (!origin || !origin.recurrenceRule) return false;

  return db.transaction(async (tx) => {
    await tx.delete(tasks).where(and(eq(tasks.userId, userId), eq(tasks.id, copy.id)));
    const set: Partial<typeof tasks.$inferInsert> = {};
    // A repeat that had run its course was finished for good on its last tick: open it again.
    if (origin.status === "done") Object.assign(set, { status: "open", completedAt: null });
    if (copy.dueDate && (!origin.dueDate || origin.dueDate > copy.dueDate)) {
      Object.assign(set, { dueDate: copy.dueDate, dueTime: copy.dueTime });
    }
    if (Object.keys(set).length > 0) {
      await tx
        .update(tasks)
        .set(set)
        .where(and(eq(tasks.userId, userId), eq(tasks.id, origin.id)));
    }
    return true;
  });
}

/** Completes or reopens a task. Completing sets `completed_at`; it never touches the parent. */
export async function setTaskDone(
  userId: string,
  taskId: string,
  done: boolean,
): Promise<Task | null> {
  const [row] = await db
    .update(tasks)
    .set({ status: done ? "done" : "open", completedAt: done ? new Date() : null })
    .where(activeTask(userId, taskId))
    .returning();
  return row ?? null;
}

/**
 * Moves a top-level task, with its subtasks, to the end of another list. Subtasks cannot be moved
 * on their own.
 * The database requires a subtask to share its parent's list at every step, so the subtasks are
 * detached, the parent moved, and the subtasks reattached, all in one transaction.
 */
export async function moveTaskToList(
  userId: string,
  taskId: string,
  listId: string,
): Promise<Task | null> {
  const task = await getTask(userId, taskId);
  if (!task || task.parentId) return null;
  if (!(await getList(userId, listId))) return null;
  const position = positionAtEnd(await lastPositionInGroup(userId, listId, null));

  return db.transaction(async (tx) => {
    const children = await tx
      .select({ id: tasks.id })
      .from(tasks)
      .where(and(eq(tasks.userId, userId), eq(tasks.parentId, taskId)));
    if (children.length > 0) {
      await tx
        .update(tasks)
        .set({ parentId: null })
        .where(and(eq(tasks.userId, userId), eq(tasks.parentId, taskId)));
    }
    const [moved] = await tx
      .update(tasks)
      .set({ listId, sectionId: null, position })
      .where(and(eq(tasks.userId, userId), eq(tasks.id, taskId)))
      .returning();
    for (const child of children) {
      await tx
        .update(tasks)
        .set({ listId, parentId: taskId })
        .where(and(eq(tasks.userId, userId), eq(tasks.id, child.id)));
    }
    return moved ?? null;
  });
}

/**
 * Puts a task between two neighbours (drag and drop). `afterId` is the task that should come
 * right before it and `beforeId` the one right after; either may be null at an edge. Both must be
 * the user's active tasks in the same list with the same parent, otherwise nothing changes and
 * null is returned.
 */
export async function reorderTask(
  userId: string,
  taskId: string,
  move: { afterId?: string | null; beforeId?: string | null },
): Promise<Task | null> {
  const task = await getTask(userId, taskId);
  if (!task) return null;

  const neighbour = async (id: string | null | undefined) => {
    if (!id) return null;
    if (id === taskId) return undefined;
    const row = await getTask(userId, id);
    if (!row || row.listId !== task.listId || row.parentId !== task.parentId) return undefined;
    return row;
  };
  const [after, before] = await Promise.all([neighbour(move.afterId), neighbour(move.beforeId)]);
  if (after === undefined || before === undefined) return null;

  const set: Partial<typeof tasks.$inferInsert> = {};

  if (after && before && after.position >= before.position) {
    // The two neighbours are tied or out of order (should not happen): put it after the first.
    set.position = positionAtEnd(after.position);
  } else {
    set.position = positionBetween(after?.position ?? null, before?.position ?? null);
  }

  const [row] = await db.update(tasks).set(set).where(activeTask(userId, taskId)).returning();
  return row ?? null;
}

/** Moves a task and its subtasks to Trash (soft delete), all with the same timestamp. */
export async function trashTask(userId: string, taskId: string): Promise<boolean> {
  const rows = await db
    .update(tasks)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(tasks.userId, userId),
        or(eq(tasks.id, taskId), eq(tasks.parentId, taskId)),
        isNull(tasks.deletedAt),
      ),
    )
    .returning({ id: tasks.id });
  return rows.some((r) => r.id === taskId);
}

/** Restores a trashed task together with the subtasks trashed at the same moment. */
export async function restoreTask(userId: string, taskId: string): Promise<boolean> {
  const [task] = await db
    .select({ deletedAt: tasks.deletedAt })
    .from(tasks)
    .where(and(eq(tasks.userId, userId), eq(tasks.id, taskId)));
  if (!task?.deletedAt) return false;
  const rows = await db
    .update(tasks)
    .set({ deletedAt: null })
    .where(
      and(
        eq(tasks.userId, userId),
        or(eq(tasks.id, taskId), eq(tasks.parentId, taskId)),
        eq(tasks.deletedAt, task.deletedAt),
      ),
    )
    .returning({ id: tasks.id });
  return rows.some((r) => r.id === taskId);
}

/** Permanently deletes a task (and its subtasks). */
export async function deleteTaskForever(userId: string, taskId: string): Promise<boolean> {
  const rows = await db
    .delete(tasks)
    .where(and(eq(tasks.userId, userId), eq(tasks.id, taskId)))
    .returning({ id: tasks.id });
  return rows.length > 0;
}

/** Kept for the ownership tests and simple callers: change only the title. */
export async function updateTaskTitle(
  userId: string,
  taskId: string,
  title: string,
): Promise<Task | null> {
  return updateTask(userId, taskId, { title });
}

/**
 * Duplicate (CLAUDE.md §6.2, P1): a copy at the end of the same list (or of the same parent's
 * subtasks), titled "<title> (copy)", with the same notes, priority, dates and repeat. A task's
 * subtasks are copied too, all open. Returns null when the task is not the user's.
 */
export async function duplicateTask(userId: string, taskId: string): Promise<Task | null> {
  const detail = await getTaskDetail(userId, taskId);
  if (!detail) return null;
  const { task: source, subtasks } = detail;
  const copy = await createTask(userId, {
    listId: source.listId,
    parentId: source.parentId,
    title: `${source.title} (copy)`.slice(0, 500),
    notes: source.notes,
    priority: source.priority,
    dueDate: source.dueDate,
    dueTime: source.dueTime,
    recurrenceRule: source.recurrenceRule,
    recurrenceMode: source.recurrenceMode,
    recurrenceUntil: source.recurrenceUntil,
  });
  if (!copy) return null;
  // The reminder comes along, "None" included (it may be switching the default off).
  const reminder = await getTaskReminder(userId, source.id);
  if (reminder) {
    await setTaskReminder(userId, copy.id, rowToChoice(reminder));
  }
  if (!source.parentId) {
    for (const sub of subtasks) {
      await createTask(userId, {
        listId: source.listId,
        parentId: copy.id,
        title: sub.title,
        notes: sub.notes,
        priority: sub.priority,
        dueDate: sub.dueDate,
        dueTime: sub.dueTime,
      });
    }
  }
  return copy;
}

/**
 * Deletes a list but keeps its tasks (docs/new_design.md screen 2i): every task in it, with its
 * subtasks, moves to the end of `targetListId` first, then the empty list goes to Trash. Returns
 * false when either list is not the user's, they are the same list, or the list is General.
 */
export async function trashListKeepingTasks(
  userId: string,
  listId: string,
  targetListId: string,
): Promise<boolean> {
  if (listId === targetListId) return false;
  const [list, target] = await Promise.all([
    getList(userId, listId),
    getList(userId, targetListId),
  ]);
  if (!list || !target || list.isInbox) return false;
  for (const task of await listTasksInList(userId, listId)) {
    if (!task.parentId) await moveTaskToList(userId, task.id, targetListId);
  }
  return trashList(userId, listId);
}

/**
 * Restores a task from Trash where it can be seen (docs/new_design.md screen 6i): if its list is
 * still in Trash, a top-level task moves to General. Returns the list it ended up in, or null when
 * the task was not in the user's Trash.
 */
export async function restoreTaskVisibly(
  userId: string,
  taskId: string,
): Promise<{ listId: string; listName: string; movedToGeneral: boolean } | null> {
  if (!(await restoreTask(userId, taskId))) return null;
  // Read the row directly: getTask hides tasks whose list is in Trash, which is the case here.
  const [task] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.userId, userId), eq(tasks.id, taskId)));
  if (!task) return null;
  const list = await getList(userId, task.listId, { includeTrashed: true });
  if (list && !list.deletedAt)
    return { listId: list.id, listName: list.name, movedToGeneral: false };

  const inbox = await getInbox(userId);
  const topId = task.parentId ?? task.id;
  const position = positionAtEnd(await lastPositionInGroup(userId, inbox.id, null));
  // Same steps as moveTaskToList: a subtask must share its parent's list at every moment.
  await db.transaction(async (tx) => {
    const children = await tx
      .select({ id: tasks.id })
      .from(tasks)
      .where(and(eq(tasks.userId, userId), eq(tasks.parentId, topId)));
    if (children.length > 0) {
      await tx
        .update(tasks)
        .set({ parentId: null })
        .where(and(eq(tasks.userId, userId), eq(tasks.parentId, topId)));
    }
    await tx
      .update(tasks)
      .set({ listId: inbox.id, sectionId: null, position, deletedAt: null })
      .where(and(eq(tasks.userId, userId), eq(tasks.id, topId)));
    for (const child of children) {
      await tx
        .update(tasks)
        .set({ listId: inbox.id, parentId: topId })
        .where(and(eq(tasks.userId, userId), eq(tasks.id, child.id)));
    }
  });
  return { listId: inbox.id, listName: inbox.name, movedToGeneral: true };
}
