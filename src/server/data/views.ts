import "server-only";
import { and, desc, eq, gte, ilike, isNotNull, isNull, lte, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/server/db/client";
import { lists, tasks, type Task } from "@/server/db/schema";
import type { TaskRow } from "./tasks";

/**
 * Queries behind the cross-list views: Overview, Today, Upcoming, All and Completed.
 * Every function takes `userId` and filters by it. A task is only returned when it is not in Trash
 * and its list is neither in Trash nor archived (archiving puts a list, and its tasks, away).
 */

export type ViewTask = TaskRow & {
  listName: string;
  listIcon: string | null;
  listIsInbox: boolean;
  /** Title of the parent task when this task is a subtask. */
  parentTitle: string | null;
};

const parent = alias(tasks, "parent_task");

async function fetchViewTasks(
  userId: string,
  where: SQL | undefined,
  options: { order?: SQL; limit?: number } = {},
): Promise<ViewTask[]> {
  const query = db
    .select({
      task: tasks,
      listName: lists.name,
      listIcon: lists.icon,
      listIsInbox: lists.isInbox,
      parentTitle: parent.title,
    })
    .from(tasks)
    .innerJoin(lists, and(eq(lists.id, tasks.listId), eq(lists.userId, userId)))
    .leftJoin(parent, and(eq(parent.id, tasks.parentId), eq(parent.userId, userId)))
    .where(
      and(
        eq(tasks.userId, userId),
        isNull(tasks.deletedAt),
        isNull(lists.deletedAt),
        eq(lists.isArchived, false),
        where,
      ),
    )
    .$dynamic();
  const rows = await (options.order ? query.orderBy(options.order) : query).limit(
    options.limit ?? 5000,
  );
  return rows.map((r) => ({
    ...r.task,
    listName: r.listName,
    listIcon: r.listIcon,
    listIsInbox: r.listIsInbox,
    parentTitle: r.parentTitle,
  }));
}

/**
 * Full-text search over titles and notes (CLAUDE.md §6.2). Words are matched by their stem
 * ("pay" finds "paying") and as the start of a word while typing ("gro" finds "groceries"), all
 * words must match, and titles are also matched as plain text so a stop word like "the" still
 * finds something. Best matches first. Tasks in Trash, or in a list in Trash or archived, are
 * never returned; the words are reduced to letters and digits before they reach the query.
 */
export function searchTasks(userId: string, text: string, limit = 100): Promise<ViewTask[]> {
  const words = (text.match(/[\p{L}\p{N}]+/gu) ?? []).slice(0, 10);
  if (words.length === 0) return Promise.resolve([]);
  const query = sql`to_tsquery('english', ${words.map((w) => `${w}:*`).join(" & ")})`;
  // Letters and digits only, so nothing in here is a LIKE wildcard.
  const plain = `%${words.join(" ")}%`;
  return fetchViewTasks(userId, or(sql`${tasks.search} @@ ${query}`, ilike(tasks.title, plain)), {
    order: sql`ts_rank(${tasks.search}, ${query}) desc, ${tasks.updatedAt} desc`,
    limit,
  });
}

/** Open tasks due on or before `today` (overdue and today), subtasks included. */
export function getDueByTasks(userId: string, today: string): Promise<ViewTask[]> {
  return fetchViewTasks(
    userId,
    and(eq(tasks.status, "open"), isNotNull(tasks.dueDate), lte(tasks.dueDate, today)),
  );
}

/** Open tasks due between `from` and `to` (inclusive), subtasks included. */
export function getDueBetweenTasks(userId: string, from: string, to: string): Promise<ViewTask[]> {
  return fetchViewTasks(
    userId,
    and(eq(tasks.status, "open"), gte(tasks.dueDate, from), lte(tasks.dueDate, to)),
  );
}

/** Every task (open and done), subtasks included, so parents can show progress. */
export function getAllTasks(userId: string): Promise<ViewTask[]> {
  return fetchViewTasks(userId, undefined);
}

/** The most recently finished tasks, newest first. */
export function getCompletedTasks(userId: string, limit = 200): Promise<ViewTask[]> {
  return fetchViewTasks(userId, eq(tasks.status, "done"), {
    order: desc(tasks.completedAt),
    limit,
  });
}

/** Tasks finished on one day (a floating date, read in `timeZone`), newest first. */
export function getCompletedTasksOn(
  userId: string,
  date: string,
  timeZone: string,
): Promise<ViewTask[]> {
  return fetchViewTasks(
    userId,
    and(
      eq(tasks.status, "done"),
      sql`(${tasks.completedAt} at time zone ${timeZone})::date = ${date}`,
    ),
    { order: desc(tasks.completedAt) },
  );
}

export type { Task };

export type ListProgress = { listId: string; open: number; done: number };

/**
 * Open and finished top-level tasks per list (subtasks and Trash left out), for the progress
 * bars on the Tasks overview. Lists with no tasks are simply absent.
 */
export async function getListProgress(userId: string): Promise<ListProgress[]> {
  const rows = await db
    .select({
      listId: tasks.listId,
      open: sql<number>`count(*) filter (where ${tasks.status} = 'open')`.mapWith(Number),
      done: sql<number>`count(*) filter (where ${tasks.status} = 'done')`.mapWith(Number),
    })
    .from(tasks)
    .innerJoin(lists, and(eq(lists.id, tasks.listId), eq(lists.userId, userId)))
    .where(
      and(
        eq(tasks.userId, userId),
        isNull(tasks.parentId),
        isNull(tasks.deletedAt),
        isNull(lists.deletedAt),
        eq(lists.isArchived, false),
        // A repeating task's finished copies would inflate "done"; count the task itself only.
        isNull(tasks.recurrenceOriginId),
      ),
    )
    .groupBy(tasks.listId);
  return rows;
}
