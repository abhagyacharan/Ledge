import "server-only";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { isUniqueViolation } from "@/server/db/errors";
import { tags, taskTags, tasks, type Tag } from "@/server/db/schema";

/**
 * Data functions for tags. Names are unique per user ignoring case, so creating "Home" when
 * "home" exists returns the existing tag instead of failing.
 */

const owned = (userId: string, tagId: string) => and(eq(tags.userId, userId), eq(tags.id, tagId));

export async function listTags(userId: string): Promise<Tag[]> {
  return db
    .select()
    .from(tags)
    .where(eq(tags.userId, userId))
    .orderBy(asc(sql`lower(${tags.name})`));
}

export async function getTag(userId: string, tagId: string): Promise<Tag | null> {
  const [row] = await db.select().from(tags).where(owned(userId, tagId));
  return row ?? null;
}

/** Creates a tag, or returns the existing one with the same name (any capitalisation). */
export async function createTag(
  userId: string,
  name: string,
  color: string | null = null,
): Promise<{ tag: Tag; created: boolean }> {
  const findExisting = async () => {
    const [row] = await db
      .select()
      .from(tags)
      .where(and(eq(tags.userId, userId), sql`lower(${tags.name}) = lower(${name})`));
    return row;
  };
  const existing = await findExisting();
  if (existing) return { tag: existing, created: false };
  try {
    const [row] = await db.insert(tags).values({ userId, name, color }).returning();
    return { tag: row, created: true };
  } catch (error) {
    // Lost a race with another request creating the same tag.
    if (isUniqueViolation(error)) {
      const raced = await findExisting();
      if (raced) return { tag: raced, created: false };
    }
    throw error;
  }
}

/** Renames and/or recolors a tag. Returns "exists" when another tag already has that name. */
export async function updateTag(
  userId: string,
  tagId: string,
  patch: { name?: string; color?: string | null },
): Promise<Tag | "exists" | null> {
  if (Object.keys(patch).length === 0) return getTag(userId, tagId);
  try {
    const [row] = await db.update(tags).set(patch).where(owned(userId, tagId)).returning();
    return row ?? null;
  } catch (error) {
    if (isUniqueViolation(error)) return "exists";
    throw error;
  }
}

/** Deletes a tag. It is removed from every task; the tasks themselves are untouched. */
export async function deleteTag(userId: string, tagId: string): Promise<boolean> {
  const rows = await db.delete(tags).where(owned(userId, tagId)).returning({ id: tags.id });
  return rows.length > 0;
}

/** Tag ids for each of the given tasks (only the user's own links are read). */
export async function tagIdsForTasks(
  userId: string,
  taskIds: string[],
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (taskIds.length === 0) return map;
  const rows = await db
    .select({ taskId: taskTags.taskId, tagId: taskTags.tagId })
    .from(taskTags)
    .where(and(eq(taskTags.userId, userId), inArray(taskTags.taskId, taskIds)));
  for (const r of rows) map.set(r.taskId, [...(map.get(r.taskId) ?? []), r.tagId]);
  return map;
}

/**
 * Replaces the tags on a task. Returns false (and changes nothing) unless the task and every tag
 * belong to the user.
 */
export async function setTaskTags(
  userId: string,
  taskId: string,
  tagIds: string[],
): Promise<boolean> {
  const unique = [...new Set(tagIds)];
  return db.transaction(async (tx) => {
    const [task] = await tx
      .select({ id: tasks.id })
      .from(tasks)
      .where(and(eq(tasks.userId, userId), eq(tasks.id, taskId)));
    if (!task) return false;
    if (unique.length > 0) {
      const found = await tx
        .select({ id: tags.id })
        .from(tags)
        .where(and(eq(tags.userId, userId), inArray(tags.id, unique)));
      if (found.length !== unique.length) return false;
    }
    await tx.delete(taskTags).where(and(eq(taskTags.userId, userId), eq(taskTags.taskId, taskId)));
    if (unique.length > 0) {
      await tx.insert(taskTags).values(unique.map((tagId) => ({ userId, taskId, tagId })));
    }
    return true;
  });
}
