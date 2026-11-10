"use server";

import { fail, ok } from "@/lib/result";
import { createSection, deleteSection, moveSection, renameSection } from "@/server/data/sections";
import { createSectionSchema, listIdSchema, moveSchema, renameSectionSchema } from "../schema";
import { guarded, NOT_FOUND, refresh } from "./guard";

export async function createSectionAction(input: unknown) {
  return guarded(createSectionSchema, input, async ({ listId, name }, userId) => {
    const section = await createSection(userId, listId, name);
    if (!section) return fail(NOT_FOUND);
    refresh();
    return ok({ id: section.id });
  });
}

export async function renameSectionAction(input: unknown) {
  return guarded(renameSectionSchema, input, async ({ id, name }, userId) => {
    if (!(await renameSection(userId, id, name))) return fail(NOT_FOUND);
    refresh();
    return ok();
  });
}

export async function moveSectionAction(input: unknown) {
  return guarded(moveSchema, input, async ({ id, direction }, userId) => {
    if (!(await moveSection(userId, id, direction))) return ok(); // already at the edge
    refresh();
    return ok();
  });
}

/** Deletes a section; its tasks move to "no section". */
export async function deleteSectionAction(input: unknown) {
  return guarded(listIdSchema, input, async ({ id }, userId) => {
    if (!(await deleteSection(userId, id))) return fail(NOT_FOUND);
    refresh();
    return ok();
  });
}
