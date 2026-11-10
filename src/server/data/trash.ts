import "server-only";
import { and, count, desc, eq, inArray, isNotNull, isNull, lt, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/server/db/client";
import { lists, tasks, type List, type Task } from "@/server/db/schema";

/**
 * Trash (CLAUDE.md §6.2). Deleting a task or a list is a soft delete: it sets `deleted_at` and the
 * item waits here for 30 days, then it is erased for good. Every function takes `userId`.
 *
 * What the Trash screen lists:
 *  - lists in Trash (their tasks come back with them, so the tasks are not listed separately),
 *  - tasks in Trash whose list is not in Trash, and that are not subtasks trashed together with
 *    their parent (restoring the parent brings those back).
 */

export const TRASH_RETENTION_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export type TrashedTask = Task & {
  listName: string;
  listIcon: string | null;
  parentTitle: string | null;
};

const parent = alias(tasks, "parent_task");

export type TrashedList = List & { taskCount: number };

export async function listTrash(
  userId: string,
): Promise<{ lists: TrashedList[]; tasks: TrashedTask[] }> {
  const trashedLists = await db
    .select()
    .from(lists)
    .where(and(eq(lists.userId, userId), isNotNull(lists.deletedAt)))
    .orderBy(desc(lists.deletedAt));

  // Top-level tasks inside each trashed list, for "List with 4 tasks".
  const countRows =
    trashedLists.length === 0
      ? []
      : await db
          .select({ listId: tasks.listId, n: count() })
          .from(tasks)
          .where(
            and(
              eq(tasks.userId, userId),
              isNull(tasks.parentId),
              inArray(
                tasks.listId,
                trashedLists.map((l) => l.id),
              ),
            ),
          )
          .groupBy(tasks.listId);
  const taskCounts = new Map(countRows.map((r) => [r.listId, r.n]));

  const rows = await db
    .select({
      task: tasks,
      listName: lists.name,
      listIcon: lists.icon,
      parentTitle: parent.title,
    })
    .from(tasks)
    .innerJoin(lists, and(eq(lists.id, tasks.listId), eq(lists.userId, userId)))
    .leftJoin(parent, and(eq(parent.id, tasks.parentId), eq(parent.userId, userId)))
    .where(
      and(
        eq(tasks.userId, userId),
        isNotNull(tasks.deletedAt),
        isNull(lists.deletedAt),
        // A subtask trashed together with its parent is restored with the parent.
        or(isNull(tasks.parentId), isNull(parent.deletedAt)),
      ),
    )
    .orderBy(desc(tasks.deletedAt));

  return {
    lists: trashedLists.map((l) => ({ ...l, taskCount: taskCounts.get(l.id) ?? 0 })),
    tasks: rows.map((r) => ({
      ...r.task,
      listName: r.listName,
      listIcon: r.listIcon,
      parentTitle: r.parentTitle,
    })),
  };
}

/** Whole days left before an item deleted at `deletedAt` is erased (never below 0). */
export function daysLeftInTrash(deletedAt: Date, now: Date = new Date()): number {
  const left = Math.ceil(
    (deletedAt.getTime() + TRASH_RETENTION_DAYS * DAY_MS - now.getTime()) / DAY_MS,
  );
  return Math.max(0, left);
}

/** Permanently deletes a task that is in Trash (and its subtasks). Live tasks are never touched. */
export async function deleteTrashedTaskForever(userId: string, taskId: string): Promise<boolean> {
  const rows = await db
    .delete(tasks)
    .where(and(eq(tasks.userId, userId), eq(tasks.id, taskId), isNotNull(tasks.deletedAt)))
    .returning({ id: tasks.id });
  return rows.length > 0;
}

/** Permanently deletes a list that is in Trash, with everything in it. Live lists are never touched. */
export async function deleteTrashedListForever(userId: string, listId: string): Promise<boolean> {
  const rows = await db
    .delete(lists)
    .where(and(eq(lists.userId, userId), eq(lists.id, listId), isNotNull(lists.deletedAt)))
    .returning({ id: lists.id });
  return rows.length > 0;
}

/** Erases everything in the user's Trash. Returns how many lists and tasks were removed. */
export async function emptyTrash(userId: string): Promise<{ lists: number; tasks: number }> {
  return db.transaction(async (tx) => {
    const removedLists = await tx
      .delete(lists)
      .where(and(eq(lists.userId, userId), isNotNull(lists.deletedAt)))
      .returning({ id: lists.id });
    const removedTasks = await tx
      .delete(tasks)
      .where(and(eq(tasks.userId, userId), isNotNull(tasks.deletedAt)))
      .returning({ id: tasks.id });
    return { lists: removedLists.length, tasks: removedTasks.length };
  });
}

/**
 * Erases the user's items that have been in Trash longer than 30 days. Returns how many lists and
 * tasks were removed. `now` is a parameter so tests can move the clock.
 */
export async function purgeExpiredTrash(
  userId: string,
  now: Date = new Date(),
): Promise<{ lists: number; tasks: number }> {
  const cutoff = new Date(now.getTime() - TRASH_RETENTION_DAYS * DAY_MS);
  return db.transaction(async (tx) => {
    const removedLists = await tx
      .delete(lists)
      .where(and(eq(lists.userId, userId), isNotNull(lists.deletedAt), lt(lists.deletedAt, cutoff)))
      .returning({ id: lists.id });
    const removedTasks = await tx
      .delete(tasks)
      .where(and(eq(tasks.userId, userId), isNotNull(tasks.deletedAt), lt(tasks.deletedAt, cutoff)))
      .returning({ id: tasks.id });
    return { lists: removedLists.length, tasks: removedTasks.length };
  });
}

const lastPurge = new Map<string, number>();
const PURGE_EVERY_MS = 60 * 60 * 1000;

/**
 * On-load cleanup: runs `purgeExpiredTrash` for this user at most once an hour per server process,
 * so ordinary page loads stay cheap. Failures are logged and never block the page.
 */
export async function maybePurgeTrash(userId: string): Promise<void> {
  const now = Date.now();
  if (now - (lastPurge.get(userId) ?? 0) < PURGE_EVERY_MS) return;
  lastPurge.set(userId, now);
  try {
    await purgeExpiredTrash(userId);
  } catch (error) {
    console.error("Trash cleanup failed:", error);
  }
}
