import "server-only";
import { and, desc, eq, gte, isNotNull, isNull, lte, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/server/db/client";
import { lists, taskTags, tasks, type Task } from "@/server/db/schema";
import { tagIdsForTasks } from "./tags";
import type { TaskRow } from "./tasks";

/**
 * Queries behind the cross-list views: Today, Upcoming, All, Completed and Tag.
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
  const tagMap = await tagIdsForTasks(
    userId,
    rows.map((r) => r.task.id),
  );
  return rows.map((r) => ({
    ...r.task,
    tagIds: tagMap.get(r.task.id) ?? [],
    listName: r.listName,
    listIcon: r.listIcon,
    listIsInbox: r.listIsInbox,
    parentTitle: r.parentTitle,
  }));
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

/** Tasks that carry a tag (open and done). Returns [] for a tag that is not the user's. */
export async function getTaggedTasks(userId: string, tagId: string): Promise<ViewTask[]> {
  const links = await db
    .select({ taskId: taskTags.taskId })
    .from(taskTags)
    .where(and(eq(taskTags.userId, userId), eq(taskTags.tagId, tagId)));
  if (links.length === 0) return [];
  const all = await fetchViewTasks(userId, undefined);
  const ids = new Set(links.map((l) => l.taskId));
  return all.filter((t) => ids.has(t.id));
}

export type { Task };
