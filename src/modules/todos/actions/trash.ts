"use server";

import { fail, ok } from "@/lib/result";
import {
  deleteTrashedListForever,
  deleteTrashedTaskForever,
  emptyTrash,
} from "@/server/data/trash";
import { z } from "zod";
import { listIdSchema, taskIdSchema } from "../schema";
import { guarded, NOT_FOUND, refresh } from "./guard";

/** Permanently deletes a task that is in Trash. */
export async function deleteTaskForeverAction(input: unknown) {
  return guarded(taskIdSchema, input, async ({ id }, userId) => {
    if (!(await deleteTrashedTaskForever(userId, id))) return fail(NOT_FOUND);
    refresh();
    return ok();
  });
}

/** Permanently deletes a list that is in Trash, with its tasks. */
export async function deleteListForeverAction(input: unknown) {
  return guarded(listIdSchema, input, async ({ id }, userId) => {
    if (!(await deleteTrashedListForever(userId, id))) return fail(NOT_FOUND);
    refresh();
    return ok();
  });
}

/** Erases everything in the Trash. */
export async function emptyTrashAction(input: unknown) {
  return guarded(z.object({}), input, async (_data, userId) => {
    const removed = await emptyTrash(userId);
    refresh();
    return ok(removed);
  });
}
