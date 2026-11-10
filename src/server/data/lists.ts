import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { lists, type List } from "@/server/db/schema";

/**
 * Data functions for lists. Every function takes the authenticated `userId` and filters by it
 * (CLAUDE.md §5): a list id from the client is never trusted on its own. A list that belongs to
 * someone else looks exactly like a list that does not exist.
 *
 * Phase 3 adds create, reorder, archive and the rest on top of this.
 */

export async function listLists(userId: string): Promise<List[]> {
  return db.select().from(lists).where(eq(lists.userId, userId)).orderBy(asc(lists.position));
}

export async function getList(userId: string, listId: string): Promise<List | null> {
  const [row] = await db
    .select()
    .from(lists)
    .where(and(eq(lists.userId, userId), eq(lists.id, listId)));
  return row ?? null;
}

export async function renameList(
  userId: string,
  listId: string,
  name: string,
): Promise<List | null> {
  const [row] = await db
    .update(lists)
    .set({ name })
    .where(and(eq(lists.userId, userId), eq(lists.id, listId)))
    .returning();
  return row ?? null;
}

/** Deletes a list and its tasks. The Inbox is protected by the database and cannot be deleted. */
export async function deleteList(userId: string, listId: string): Promise<boolean> {
  const rows = await db
    .delete(lists)
    .where(and(eq(lists.userId, userId), eq(lists.id, listId)))
    .returning({ id: lists.id });
  return rows.length > 0;
}
