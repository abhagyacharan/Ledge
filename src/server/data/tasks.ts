import "server-only";
import { and, asc, eq, isNull, or, sql } from "drizzle-orm";
import { positionAtEnd, positionBetween } from "@/lib/ordering";
import { nextDueDate, parseRule, type RecurrenceMode } from "@/lib/recurrence";
import { db } from "@/server/db/client";
import { lists, taskTags, tasks, type Task } from "@/server/db/schema";
import { getList } from "./lists";
import { getSection } from "./sections";
import { tagIdsForTasks } from "./tags";

/**
 * Data functions for tasks. Every function takes the authenticated `userId` and filters by it
 * (CLAUDE.md §5). Someone else's task looks exactly like a task that does not exist.
 *
 * "Active" means: not in Trash itself, and its list is not in Trash either. Reads only return
 * active tasks. Trashing a task also trashes its subtasks, with the same timestamp, so that
 * restoring brings back exactly the rows that were trashed together.
 */

export type TaskRow = Task & { tagIds: string[] };

export type TaskPatch = {
  title?: string;
  notes?: string | null;
  priority?: number;
  dueDate?: string | null;
  dueTime?: string | null;
  sectionId?: string | null;
  /** Canonical rule text (src/lib/recurrence.ts) or null to stop repeating. */
  recurrenceRule?: string | null;
  recurrenceMode?: RecurrenceMode;
};

/** The task's list has not been moved to Trash. */
const listIsActive = sql`exists (select 1 from ${lists} where ${lists.id} = ${tasks.listId} and ${lists.deletedAt} is null)`;

const activeTask = (userId: string, taskId: string) =>
  and(eq(tasks.userId, userId), eq(tasks.id, taskId), isNull(tasks.deletedAt), listIsActive);

async function withTags(userId: string, rows: Task[]): Promise<TaskRow[]> {
  const tagMap = await tagIdsForTasks(
    userId,
    rows.map((r) => r.id),
  );
  return rows.map((r) => ({ ...r, tagIds: tagMap.get(r.id) ?? [] }));
}

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
  return withTags(userId, await listTasksInList(userId, listId));
}

export async function getTask(userId: string, taskId: string): Promise<Task | null> {
  const [row] = await db.select().from(tasks).where(activeTask(userId, taskId));
  return row ?? null;
}

/** A task with its tags and its subtasks (for the detail drawer). */
export async function getTaskDetail(
  userId: string,
  taskId: string,
): Promise<{ task: TaskRow; subtasks: TaskRow[] } | null> {
  const task = await getTask(userId, taskId);
  if (!task) return null;
  const subtasks = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.userId, userId), eq(tasks.parentId, taskId), isNull(tasks.deletedAt)))
    .orderBy(asc(tasks.position));
  const [withTagsTask, ...subs] = await withTags(userId, [task, ...subtasks]);
  return { task: withTagsTask, subtasks: subs };
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
  sectionId?: string | null;
  notes?: string | null;
  priority?: number;
  dueDate?: string | null;
  dueTime?: string | null;
  recurrenceRule?: string | null;
  recurrenceMode?: RecurrenceMode;
};

/**
 * Creates a task at the end of its list (or of its parent's subtasks). Returns null when the list,
 * parent or section is not the user's, or when the parent is itself a subtask.
 * A subtask always lives in its parent's list and has no section.
 */
export async function createTask(userId: string, input: NewTaskInput): Promise<Task | null> {
  let listId = input.listId;
  let sectionId = input.sectionId ?? null;
  const parentId = input.parentId ?? null;

  if (parentId) {
    const parent = await getTask(userId, parentId);
    if (!parent || parent.parentId) return null;
    listId = parent.listId;
    sectionId = null;
  } else {
    if (!(await getList(userId, listId))) return null;
    if (sectionId) {
      const section = await getSection(userId, sectionId);
      if (!section || section.listId !== listId) return null;
    }
  }

  const dueDate = input.dueDate ?? null;
  const recurrenceRule = input.recurrenceRule ?? null;
  // A repeat needs a due date, a top-level task and a rule we understand.
  if (recurrenceRule && (!dueDate || parentId || !parseRule(recurrenceRule))) return null;
  const [row] = await db
    .insert(tasks)
    .values({
      userId,
      listId,
      sectionId,
      parentId,
      title: input.title,
      notes: input.notes ?? null,
      priority: input.priority ?? 0,
      dueDate,
      dueTime: dueDate ? (input.dueTime ?? null) : null,
      recurrenceRule,
      recurrenceMode: input.recurrenceMode ?? "fixed",
      position: positionAtEnd(await lastPositionInGroup(userId, listId, parentId)),
    })
    .returning();
  return row;
}

/**
 * Updates fields of a task. Clearing the due date also clears the due time. Returns null when the
 * task is not the user's, or when the section is not in the task's list (or the task is a subtask).
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
  } else if (patch.dueDate === null && current.recurrenceRule) {
    set.recurrenceRule = null; // a repeating task with no date has nothing to repeat from
  }
  if (patch.recurrenceMode !== undefined) set.recurrenceMode = patch.recurrenceMode;
  if (patch.sectionId !== undefined) {
    if (patch.sectionId !== null) {
      if (current.parentId) return null;
      const section = await getSection(userId, patch.sectionId);
      if (!section || section.listId !== current.listId) return null;
    }
    set.sectionId = patch.sectionId;
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

/**
 * Completing a repeating task (CLAUDE.md §6.2): a finished copy ("snapshot", pointing back at the
 * task through `recurrence_origin_id`) is added to Completed, and the task itself stays open with
 * its due date moved to the next date. Its done subtasks are reopened and the snapshot keeps the
 * tags. Returns null when the task is not the user's, is not a repeating open task, or the rule is
 * not understood (then the caller completes it like any other task).
 */
export async function completeRecurringTask(
  userId: string,
  taskId: string,
  completedOn: string,
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

  return db.transaction(async (tx) => {
    const [snapshot] = await tx
      .insert(tasks)
      .values({
        userId,
        listId: task.listId,
        sectionId: task.sectionId,
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

    const tagRows = await tx
      .select({ tagId: taskTags.tagId })
      .from(taskTags)
      .where(and(eq(taskTags.userId, userId), eq(taskTags.taskId, task.id)));
    if (tagRows.length > 0) {
      await tx
        .insert(taskTags)
        .values(tagRows.map((r) => ({ userId, taskId: snapshot.id, tagId: r.tagId })));
    }

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

    await tx
      .update(tasks)
      .set({ dueDate: nextDue })
      .where(and(eq(tasks.userId, userId), eq(tasks.id, task.id)));

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
 * Moves a top-level task, with its subtasks, to the end of another list. The section is cleared
 * unless `sectionId` (in the target list) is given. Subtasks cannot be moved on their own.
 * The database requires a subtask to share its parent's list at every step, so the subtasks are
 * detached, the parent moved, and the subtasks reattached, all in one transaction.
 */
export async function moveTaskToList(
  userId: string,
  taskId: string,
  listId: string,
  sectionId: string | null = null,
): Promise<Task | null> {
  const task = await getTask(userId, taskId);
  if (!task || task.parentId) return null;
  if (!(await getList(userId, listId))) return null;
  if (sectionId) {
    const section = await getSection(userId, sectionId);
    if (!section || section.listId !== listId) return null;
  }
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
      .set({ listId, sectionId, position })
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
 * null is returned. `sectionId` (undefined = keep, null = no section) moves it to another section
 * of the same list; subtasks have no section.
 */
export async function reorderTask(
  userId: string,
  taskId: string,
  move: { afterId?: string | null; beforeId?: string | null; sectionId?: string | null },
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
  if (move.sectionId !== undefined) {
    if (move.sectionId !== null) {
      if (task.parentId) return null;
      const section = await getSection(userId, move.sectionId);
      if (!section || section.listId !== task.listId) return null;
    }
    set.sectionId = move.sectionId;
  }

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
