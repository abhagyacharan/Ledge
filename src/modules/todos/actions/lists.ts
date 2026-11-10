"use server";

import { fail, ok } from "@/lib/result";
import {
  createList,
  getList,
  moveList,
  restoreList,
  setListArchived,
  trashList,
  updateList,
} from "@/server/data/lists";
import {
  archiveListSchema,
  createListSchema,
  listIdSchema,
  moveSchema,
  updateListSchema,
} from "../schema";
import { guarded, NOT_FOUND, refresh } from "./guard";

export async function createListAction(input: unknown) {
  return guarded(createListSchema, input, async (data, userId) => {
    const list = await createList(userId, data);
    refresh();
    return ok({ id: list.id });
  });
}

export async function updateListAction(input: unknown) {
  return guarded(updateListSchema, input, async ({ id, ...patch }, userId) => {
    const current = await getList(userId, id);
    if (!current) return fail(NOT_FOUND);
    if (current.isInbox && patch.name !== undefined) return fail("The Inbox can't be renamed.");
    // Drop keys the caller did not send so they are not written as undefined.
    const defined = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
    const updated = await updateList(userId, id, defined);
    if (!updated) return fail(NOT_FOUND);
    refresh();
    return ok();
  });
}

export async function archiveListAction(input: unknown) {
  return guarded(archiveListSchema, input, async ({ id, archived }, userId) => {
    const current = await getList(userId, id);
    if (!current) return fail(NOT_FOUND);
    if (current.isInbox) return fail("The Inbox can't be archived.");
    await setListArchived(userId, id, archived);
    refresh();
    return ok();
  });
}

export async function moveListAction(input: unknown) {
  return guarded(moveSchema, input, async ({ id, direction }, userId) => {
    if (!(await getList(userId, id))) return fail(NOT_FOUND);
    await moveList(userId, id, direction);
    refresh();
    return ok();
  });
}

/** Moves a list, with its tasks, to Trash. */
export async function trashListAction(input: unknown) {
  return guarded(listIdSchema, input, async ({ id }, userId) => {
    const current = await getList(userId, id);
    if (!current) return fail(NOT_FOUND);
    if (current.isInbox) return fail("The Inbox can't be deleted.");
    await trashList(userId, id);
    refresh();
    return ok();
  });
}

export async function restoreListAction(input: unknown) {
  return guarded(listIdSchema, input, async ({ id }, userId) => {
    if (!(await restoreList(userId, id))) return fail(NOT_FOUND);
    refresh();
    return ok();
  });
}
