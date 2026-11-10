"use server";

import { fail, ok } from "@/lib/result";
import { createTag, deleteTag, updateTag } from "@/server/data/tags";
import { createTagSchema, listIdSchema, updateTagSchema } from "../schema";
import { guarded, NOT_FOUND, refresh } from "./guard";

/** Creates a tag, or returns the existing one with the same name (any capitalisation). */
export async function createTagAction(input: unknown) {
  return guarded(createTagSchema, input, async ({ name, color }, userId) => {
    const { tag, created } = await createTag(userId, name, color ?? null);
    refresh();
    return ok({ id: tag.id, name: tag.name, color: tag.color, created });
  });
}

export async function updateTagAction(input: unknown) {
  return guarded(updateTagSchema, input, async ({ id, ...patch }, userId) => {
    const defined = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
    const result = await updateTag(userId, id, defined);
    if (result === "exists")
      return fail("You already have a tag with that name.", { name: "Name taken" });
    if (!result) return fail(NOT_FOUND);
    refresh();
    return ok();
  });
}

export async function deleteTagAction(input: unknown) {
  return guarded(listIdSchema, input, async ({ id }, userId) => {
    if (!(await deleteTag(userId, id))) return fail(NOT_FOUND);
    refresh();
    return ok();
  });
}
