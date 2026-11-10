import "server-only";
import { and, asc, eq, isNotNull, isNull } from "drizzle-orm";
import { positionAtEnd, positionForStep } from "@/lib/ordering";
import { db } from "@/server/db/client";
import { lists, type List } from "@/server/db/schema";
import { ensureUserDefaults } from "@/server/user-defaults";

/**
 * Data functions for lists. Every function takes the authenticated `userId` and filters by it
 * (CLAUDE.md §5): a list id from the client is never trusted on its own. A list that belongs to
 * someone else looks exactly like a list that does not exist.
 *
 * Lists are soft-deleted (`deleted_at`): a trashed list and its tasks disappear together and come
 * back together. "Archived" is a separate, reversible way of putting a list away.
 */

export type ListPatch = Partial<
  Pick<List, "name" | "icon" | "color" | "description" | "targetDate">
>;

const owned = (userId: string, listId: string) =>
  and(eq(lists.userId, userId), eq(lists.id, listId));

/** Lists in sidebar order, hiding archived and trashed lists unless asked. */
export async function listLists(
  userId: string,
  options: { includeArchived?: boolean } = {},
): Promise<List[]> {
  return db
    .select()
    .from(lists)
    .where(
      and(
        eq(lists.userId, userId),
        isNull(lists.deletedAt),
        options.includeArchived ? undefined : eq(lists.isArchived, false),
      ),
    )
    .orderBy(asc(lists.position));
}

export async function listArchivedLists(userId: string): Promise<List[]> {
  return db
    .select()
    .from(lists)
    .where(and(eq(lists.userId, userId), isNull(lists.deletedAt), eq(lists.isArchived, true)))
    .orderBy(asc(lists.position));
}

export async function listTrashedLists(userId: string): Promise<List[]> {
  return db
    .select()
    .from(lists)
    .where(and(eq(lists.userId, userId), isNotNull(lists.deletedAt)))
    .orderBy(asc(lists.deletedAt));
}

/** One list. Trashed lists are hidden unless `includeTrashed` is set. */
export async function getList(
  userId: string,
  listId: string,
  options: { includeTrashed?: boolean } = {},
): Promise<List | null> {
  const [row] = await db
    .select()
    .from(lists)
    .where(
      and(owned(userId, listId), options.includeTrashed ? undefined : isNull(lists.deletedAt)),
    );
  return row ?? null;
}

/** The user's Inbox. Recreates the settings and Inbox rows if sign-up ever left them missing. */
export async function getInbox(userId: string): Promise<List> {
  const find = async () => {
    const [row] = await db
      .select()
      .from(lists)
      .where(and(eq(lists.userId, userId), eq(lists.isInbox, true)));
    return row;
  };
  const existing = await find();
  if (existing) return existing;
  await ensureUserDefaults(userId);
  const created = await find();
  if (!created) throw new Error("Could not create the Inbox");
  return created;
}

async function lastPosition(userId: string): Promise<string | null> {
  const rows = await db
    .select({ position: lists.position })
    .from(lists)
    .where(eq(lists.userId, userId));
  // Compare as plain strings, the same way the fractional-index library does.
  return rows.reduce<string | null>(
    (max, r) => (max === null || r.position > max ? r.position : max),
    null,
  );
}

export async function createList(
  userId: string,
  input: { name: string } & ListPatch,
): Promise<List> {
  const [row] = await db
    .insert(lists)
    .values({ ...input, userId, position: positionAtEnd(await lastPosition(userId)) })
    .returning();
  return row;
}

export async function updateList(
  userId: string,
  listId: string,
  patch: ListPatch,
): Promise<List | null> {
  if (Object.keys(patch).length === 0) return getList(userId, listId);
  const [row] = await db
    .update(lists)
    .set(patch)
    .where(and(owned(userId, listId), isNull(lists.deletedAt)))
    .returning();
  return row ?? null;
}

export async function renameList(
  userId: string,
  listId: string,
  name: string,
): Promise<List | null> {
  return updateList(userId, listId, { name });
}

/** Archive or unarchive. The Inbox cannot be archived (the database refuses). */
export async function setListArchived(
  userId: string,
  listId: string,
  archived: boolean,
): Promise<List | null> {
  const [row] = await db
    .update(lists)
    .set({ isArchived: archived })
    .where(and(owned(userId, listId), isNull(lists.deletedAt)))
    .returning();
  return row ?? null;
}

/** Saves how a list is sorted, grouped and filtered (`lists.view_settings`). */
export async function setListViewSettings(
  userId: string,
  listId: string,
  viewSettings: Record<string, unknown>,
): Promise<boolean> {
  const rows = await db
    .update(lists)
    .set({ viewSettings })
    .where(and(owned(userId, listId), isNull(lists.deletedAt)))
    .returning({ id: lists.id });
  return rows.length > 0;
}

/** Remembers whether this list is shown as a list or as a board (columns = sections). */
export async function setListViewMode(
  userId: string,
  listId: string,
  viewMode: "list" | "board",
): Promise<boolean> {
  const rows = await db
    .update(lists)
    .set({ viewMode })
    .where(and(owned(userId, listId), isNull(lists.deletedAt)))
    .returning({ id: lists.id });
  return rows.length > 0;
}

/** Moves a list one step up or down in the sidebar order. */
export async function moveList(
  userId: string,
  listId: string,
  direction: "up" | "down",
): Promise<boolean> {
  const siblings = await db
    .select({ id: lists.id, position: lists.position })
    .from(lists)
    .where(and(eq(lists.userId, userId), isNull(lists.deletedAt), eq(lists.isArchived, false)));
  const position = positionForStep(siblings, listId, direction);
  if (position === null) return false;
  const rows = await db
    .update(lists)
    .set({ position })
    .where(owned(userId, listId))
    .returning({ id: lists.id });
  return rows.length > 0;
}

/** Moves a list (with its tasks) to Trash. The Inbox cannot be trashed (the database refuses). */
export async function trashList(userId: string, listId: string): Promise<boolean> {
  const rows = await db
    .update(lists)
    .set({ deletedAt: new Date() })
    .where(and(owned(userId, listId), isNull(lists.deletedAt)))
    .returning({ id: lists.id });
  return rows.length > 0;
}

export async function restoreList(userId: string, listId: string): Promise<boolean> {
  const rows = await db
    .update(lists)
    .set({ deletedAt: null })
    .where(and(owned(userId, listId), isNotNull(lists.deletedAt)))
    .returning({ id: lists.id });
  return rows.length > 0;
}

/** Permanently deletes a list and everything in it. The Inbox is protected by the database. */
export async function deleteListForever(userId: string, listId: string): Promise<boolean> {
  const rows = await db.delete(lists).where(owned(userId, listId)).returning({ id: lists.id });
  return rows.length > 0;
}
