import "server-only";
import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/server/db/client";
import { tasks, type Task } from "@/server/db/schema";

/**
 * Data functions for tasks. Every function takes the authenticated `userId` and filters by it
 * (CLAUDE.md §5). Someone else's task looks exactly like a task that does not exist.
 * Reads skip tasks in Trash (`deleted_at` set).
 *
 * Phase 3 adds create, complete, move, reorder and the rest on top of this.
 */

export async function listTasksInList(userId: string, listId: string): Promise<Task[]> {
  return db
    .select()
    .from(tasks)
    .where(and(eq(tasks.userId, userId), eq(tasks.listId, listId), isNull(tasks.deletedAt)))
    .orderBy(asc(tasks.position));
}

export async function getTask(userId: string, taskId: string): Promise<Task | null> {
  const [row] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.userId, userId), eq(tasks.id, taskId), isNull(tasks.deletedAt)));
  return row ?? null;
}

export async function updateTaskTitle(
  userId: string,
  taskId: string,
  title: string,
): Promise<Task | null> {
  const [row] = await db
    .update(tasks)
    .set({ title })
    .where(and(eq(tasks.userId, userId), eq(tasks.id, taskId), isNull(tasks.deletedAt)))
    .returning();
  return row ?? null;
}

/** Moves a task to Trash (soft delete). */
export async function trashTask(userId: string, taskId: string): Promise<boolean> {
  const rows = await db
    .update(tasks)
    .set({ deletedAt: new Date() })
    .where(and(eq(tasks.userId, userId), eq(tasks.id, taskId), isNull(tasks.deletedAt)))
    .returning({ id: tasks.id });
  return rows.length > 0;
}

/** Permanently deletes a task (and its subtasks). */
export async function deleteTaskForever(userId: string, taskId: string): Promise<boolean> {
  const rows = await db
    .delete(tasks)
    .where(and(eq(tasks.userId, userId), eq(tasks.id, taskId)))
    .returning({ id: tasks.id });
  return rows.length > 0;
}
