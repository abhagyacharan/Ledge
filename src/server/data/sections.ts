import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { positionAtEnd, positionForStep } from "@/lib/ordering";
import { db } from "@/server/db/client";
import { sections, type Section } from "@/server/db/schema";
import { getList } from "./lists";

/** Data functions for sections (headings inside a list). Every function takes `userId`. */

const owned = (userId: string, sectionId: string) =>
  and(eq(sections.userId, userId), eq(sections.id, sectionId));

export async function listSections(userId: string, listId: string): Promise<Section[]> {
  return db
    .select()
    .from(sections)
    .where(and(eq(sections.userId, userId), eq(sections.listId, listId)))
    .orderBy(asc(sections.position));
}

export async function getSection(userId: string, sectionId: string): Promise<Section | null> {
  const [row] = await db.select().from(sections).where(owned(userId, sectionId));
  return row ?? null;
}

/** Creates a section at the end of a list. Returns null if the list is not the user's. */
export async function createSection(
  userId: string,
  listId: string,
  name: string,
): Promise<Section | null> {
  if (!(await getList(userId, listId))) return null;
  const existing = await listSections(userId, listId);
  const last = existing.at(-1)?.position ?? null;
  const [row] = await db
    .insert(sections)
    .values({ userId, listId, name, position: positionAtEnd(last) })
    .returning();
  return row;
}

export async function renameSection(
  userId: string,
  sectionId: string,
  name: string,
): Promise<Section | null> {
  const [row] = await db.update(sections).set({ name }).where(owned(userId, sectionId)).returning();
  return row ?? null;
}

export async function moveSection(
  userId: string,
  sectionId: string,
  direction: "up" | "down",
): Promise<boolean> {
  const section = await getSection(userId, sectionId);
  if (!section) return false;
  const siblings = await listSections(userId, section.listId);
  const position = positionForStep(siblings, sectionId, direction);
  if (position === null) return false;
  await db.update(sections).set({ position }).where(owned(userId, sectionId));
  return true;
}

/** Deletes a section. Its tasks stay in the list and move to "no section". */
export async function deleteSection(userId: string, sectionId: string): Promise<boolean> {
  const rows = await db
    .delete(sections)
    .where(owned(userId, sectionId))
    .returning({ id: sections.id });
  return rows.length > 0;
}
